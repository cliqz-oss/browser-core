import { URLInfo } from '../antitracking/url';
import { getGeneralDomain } from '../antitracking/domain';

import logger from './logger';
import { parseList, parseJSResource, NetworkFilter, CosmeticFilter } from './filters-parsing';
import { matchNetworkFilter, matchCosmeticFilter } from './filters-matching';
import { tokenize, fastHash, packInt32, fastStartsWith } from './utils';
import networkFiltersOptimizer from './optimizer';


/**
 * Helper function used to serialize a bucket (one single entry of a
 * ReverseIndex) into a string. Each entry is made of a `token` (used to index
 * the bucket) and a list of filters.
 *
 * The resulting serialization is formatted as follows:
 * - The first two chars are the hash of the token (as returned by packInt32)
 * - Each group of two chars following is a valid filter id (same format ^)
 *
 * eg: c1 c2 c3 c4 c5 c6 c7 c8
 *     |---^ |---^ |---^ ^---^ is the id of the third filter ("c7c8")
 *     |     |     ^ is the id of the second filter          ("c5c6")
 *     |     ^ is the id of the first filter                 ("c3c4")
 *     ^ is the hash of the token                            ("c1c2")
 */
function serializeBucket(token, filters) {
  let bucketLine = token; // Line accumulator
  //               ^ first 2 chars are the hashed key

  for (let j = 0; j < filters.length; j += 1) {
    bucketLine += filters[j].id;
  }

  return bucketLine;
}


/**
 * Helper function used to load a bucket from the serialized version returned by
 * `serializeBucket`. Given as an argument is a line returned by
 * `serializeBucket` as well as `filters` (a mapping from filters ids to the
 * filters themselves) and `start` which is the index of the first filter id on
 * the line (usually 0, except if the line does not has a token hash at the
 * begining, as is the case with the special "wild-card bucket", a.k.a. the
 * bucket with an empty token as a key).
 */
function deserializeBucket(line, filters, start) {
  const bucket = [];

  // Get filters
  for (let j = start; j < line.length; j += 2) {
    const filterId = line.substr(j, 2);
    bucket.push(filters[filterId]);
  }

  return {
    filters: bucket,
    hit: 0,
    optimized: false,
  };
}


/**
 * Accelerating data structure based on a reverse token index. The creation of
 * the index follows the following algorithm:
 *   1. Tokenize each filter
 *   2. Compute a histogram of frequency of each token (globally)
 *   3. Select the best token for each filter (lowest frequency)
 *
 * By default, each filter is only indexed once, using its token having the
 * lowest global frequency. This is to minimize the size of buckets.
 *
 * The ReverseIndex can be extended in two ways to provide more advanced
 * features:
 *   1. It is possible to provide an `optimizer` function, which takes as input
 *   a list of filters (typically the content of a bucket) and returns another
 *   list of filters (new content of the bucket), more compact/efficient. This
 *   allows to dynamically optimize the filters and make matching time and memory
 *   consumption lower. This optimization can be done ahead of time on all
 *   buckets, or dynamically when a bucket is 'hot' (hit several times).
 *
 *   Currently this is only available for network filters.
 *
 *   2. Insert a filter multiple times (with multiple keys). It is sometimes
 *   needed to insert the same filter at different keys. For this purpose it is
 *   possible to provide the `multiKeys` options + a `getTokens` tokenizer
 *   returning a list of list of tokens (instead of just a list of token).
 *
 *   For each set of tokens returned by the `getTokens` function, the filter
 *   will be inserted once. This is currently used only for hostname dispatch of
 *   cosmetic filters.
 */
class ReverseIndex {
  constructor(filters, getTokens, { optimizer, multiKeys }) {
    // Mapping from tokens to filters
    this.index = Object.create(null);

    this.optimizer = optimizer;
    this.getTokens = getTokens;
    this.multiKeys = multiKeys || false;

    this.addFilters(filters || []);
  }

  /**
   * Transforms the `index` attribute of the `ReverseIndex` instance into a
   * serialized version (JSON-serializable Object). Other attributes are not
   * serialized (optimizer, getTokens, multiKeys) and will have to be restored
   * using the context (cf: `load` method of the `FiltersEngine`).
   */
  jsonify() {
    /* eslint-disable no-continue */
    const index = this.index;
    const lines = [];

    // The first entry of `lines` is the wildcard bucket (empty token)
    const wildCardBucket = index[''];
    if (wildCardBucket) {
      lines.push(serializeBucket('', wildCardBucket.filters));
    } else {
      lines.push('');
    }

    // Serialize all other buckets (the ones having a non-empty token).
    const tokens = Object.keys(index);
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (token === '') { continue; }
      lines.push(serializeBucket(token, index[token].filters));
    }

    return lines;
  }

  /**
   * Given the result of the `jsonify` method of the `ReverseIndex`, restores
   * its content *in-place* into the `index` attribute. The other attributes
   * (optimizer, getTokens, multiKeys) are unchanged.
   */
  load(lines, filters) {
    // Each line is one entry in the index (ie: one token and a list of filters)
    const index = Object.create(null);

    // Deserialize the wildcard bucket
    const wildCardLine = lines[0];
    if (wildCardLine !== '') {
      index[''] = deserializeBucket(wildCardLine, filters, 0);
    }

    // Deserialize other buckets
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      index[line.substr(0, 2)] = deserializeBucket(line, filters, 2);
    }

    this.index = index;
  }

  addFilters(filters) {
    /* eslint-disable no-continue */
    const length = filters.length;
    const idToTokens = Object.create(null);
    const histogram = Object.create(null);

    // Update histogram with new tokens
    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];

      // Deal with filters generating several sets of tokens
      // (eg: cosmetic filters and their hostnames)
      const multiTokens = this.multiKeys ? this.getTokens(filter) : [this.getTokens(filter)];

      idToTokens[filter.id] = multiTokens;
      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          histogram[token] = (histogram[token] || 0) + 1;
        }
      }
    }

    // For each filter, take the best token (least seen)
    for (let i = 0; i < filters.length; i += 1) {
      let wildCardInserted = false;
      const filter = filters[i];
      const multiTokens = idToTokens[filter.id];

      for (let j = 0; j < multiTokens.length; j += 1) {
        const tokens = multiTokens[j];

        // Empty token is used as a wild-card
        let bestToken = '';
        let count = length;
        for (let k = 0; k < tokens.length; k += 1) {
          const token = tokens[k];
          const tokenCount = histogram[token];
          if (tokenCount < count) {
            bestToken = token;
            count = tokenCount;
          }
        }

        // Only allow each filter to be present one time in the wildcard
        if (bestToken === '') {
          if (wildCardInserted) {
            continue;
          } else {
            wildCardInserted = true;
          }
        }

        // Add filter to the corresponding bucket
        const bucket = this.index[bestToken];
        if (bucket === undefined) {
          this.index[bestToken] = {
            hit: 0,
            filters: [filter],
            optimized: false,
          };
        } else {
          bucket.filters.push(filter);
        }
      }
    }
  }

  optimize(bucket) {
    /* eslint-disable no-param-reassign */
    // TODO - number of hits should depend on size of the bucket as payoff from
    // big buckets will be higher than on small buckets.
    if (this.optimizer && !bucket.optimized && bucket.hit >= 5) {
      if (bucket.filters.length > 1) {
        const t0 = Date.now();
        const sizeBefore = bucket.filters.length;
        bucket.filters = this.optimizer(bucket.filters);
        const sizeAfter = bucket.filters.length;
        const total = Date.now() - t0;
        logger.log(`optimized index in ${total} ms (from ${sizeBefore} to ${sizeAfter} filters)`);
      }

      bucket.optimized = true;
    }
  }

  /**
   * If a bucket exist for the given `token`, call the callback on each filter
   * found inside. An early termination mechanism is built-in, to stop iterating
   * as soon as `false` is returned from the callback.
   */
  iterBucket(token, cb) {
    const bucket = this.index[token];
    if (bucket !== undefined) {
      bucket.hit += 1;
      this.optimize(bucket);

      const filters = bucket.filters;
      for (let k = 0; k < filters.length; k += 1) {
        // Break the loop if the callback returns `false`
        if (cb(filters[k]) === false) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Iterate on all filters found in buckets associated with the given list of
   * tokens. The callback is called on each of them. Early termination can be
   * achieved if the callback returns `false`.
   */
  iterMatchingFilters(tokens, cb) {
    // Doing so will make sure that time to find a match is minimized over time
    for (let j = 0; j < tokens.length; j += 1) {
      if (this.iterBucket(tokens[j], cb) === false) {
        return;
      }
    }

    // Fallback to '' bucket if nothing was found before.
    this.iterBucket('', cb);
  }

  /**
   * Outputs a report of bucket sizes using the `logger`. This is mainly
   * designed for debugging purposes.
   */
  report() {
    const sizes = Object.create(null);
    // Report size of buckets
    Object.keys(this.index).forEach((token) => {
      const bucket = this.index[token];
      sizes[bucket.length] = (sizes[bucket.length] || 0) + 1;
      if (bucket.length > 5) {
        logger.log(`adblocker size bucket "${token}" => ${bucket.length}`);
        bucket.forEach((f) => {
          logger.log(`    ${f.pprint()} ${f.mask}`);
        });
      }
    });

    Object.keys(sizes).forEach((size) => {
      const count = sizes[size];
      logger.log(`adblocker sizes ${size} => ${count} buckets`);
    });
  }
}


/**
 * Accelerating data structure for network filters matching. Makes use of the
 * reverse index structure defined above.
 */
class NetworkFilterBucket {
  constructor(name, filters) {
    this.name = name;
    this.index = new ReverseIndex(
      filters,
      filter => filter.getTokens(),
      { optimizer: networkFiltersOptimizer },
    );
  }

  report() { this.index.report(); }

  match(request) {
    let match = null;

    const checkMatch = (filter) => {
      if (matchNetworkFilter(filter, request)) {
        match = filter;
        return false; // Break iteration
      }

      return true; // Continue iterating on buckets
    };

    this.index.iterMatchingFilters(request.tokens, checkMatch);
    return match;
  }
}


class CosmeticFilterBucket {
  constructor(filters) {
    // This accelerating data structure is used to retrieve cosmetic filters for
    // a given hostname. We only store filters having at least one hostname
    // specified and we index each filter several time (one time per hostname).
    this.hostnameIndex = new ReverseIndex(
      (filters || []).filter(f => f.hasHostnames()),
      (filter) => {
        const multiTokens = [];
        filter.getHostnames().forEach((h) => {
          multiTokens.push(tokenize(h));
        });
        return multiTokens;
      },
      { multiKeys: true },
    );

    // Store cosmetic filters dispatched using their selector. This will allow a
    // fast look-up when we need to get a set of rules to inject in a window,
    // based on some node information.
    this.selectorIndex = new ReverseIndex(
      (filters || []).filter(f => !(f.isScriptBlock() || f.isScriptInject())),
      filter => filter.getTokensSelector(),
      {},
    );
  }

  report() { }

  createContentScriptResponse(rules) {
    const styles = [];
    const scripts = [];
    const blockedScripts = [];

    for (let i = 0; i < rules.length; i += 1) {
      const rule = rules[i];
      const selector = rule.getSelector();

      if (rule.isScriptBlock()) {
        blockedScripts.push(selector);
      } else if (rule.isScriptInject()) {
        scripts.push(selector);
      } else {
        styles.push(selector);
      }
    }

    return {
      styles,
      scripts,
      blockedScripts,
      active: true,
    };
  }

  filterExceptions(matches) {
    const matchingRules = new Map();

    for (let i = 0; i < matches.length; i += 1) {
      const { rule, hostname } = matches[i];
      const selector = rule.getSelector();
      const isException = fastStartsWith(hostname, '~');
      if (matchingRules.has(selector)) {
        const otherRule = matchingRules.get(selector);

        if (rule.isUnhide() ||
          isException ||
          hostname.length > otherRule.hostname.length) {
          // Take the longest hostname
          matchingRules.set(selector, {
            rule,
            isException,
            hostname,
          });
        }
      } else {
        // Add rule
        matchingRules.set(selector, {
          rule,
          isException,
          hostname,
        });
      }
    }

    const rules = [];
    matchingRules.forEach(({ rule, isException }) => {
      if (!isException && !rule.isUnhide()) {
        rules.push(rule);
      }
    });

    return rules;
  }

  getDomainRules(url, js) {
    /* eslint-disable no-param-reassign, no-plusplus */
    const t0 = Date.now();

    let hostname = URLInfo.get(url).hostname;
    if (fastStartsWith(hostname, 'www.')) {
      hostname = hostname.substr(4);
    }

    // Collect matching rules
    const rules = [];
    const checkMatch = (rule) => {
      const result = matchCosmeticFilter(rule, hostname);
      if (result !== null) {
        // Update script injection rule
        if (rule.isScriptInject() && !rule.scriptReplaced) {
          if (rule.getSelector().indexOf(',') !== -1) {
            const parts = rule.getSelector().split(',');
            rule.selector = parts[0];
            rule.scriptArguments = parts.slice(1).map(String.trim);
          }

          rule.selector = js.get(rule.getSelector());
          if (rule.scriptArguments) {
            rule.scriptArguments.forEach((e, idx) => {
              rule.selector = rule.getSelector().replace(`{{${++idx}}}`, e);
            });
          }
          rule.scriptReplaced = true;
        }

        rules.push({
          rule,
          hostname: result.hostname,
        });
      }

      return true;
    };

    this.hostnameIndex.iterMatchingFilters(tokenize(hostname), checkMatch);

    const result = this.filterExceptions(rules);
    const total = Date.now() - t0;
    logger.debug(`cosmetic domain match ${total} ms`);

    return result;
  }

  getMatchingRules(url, nodeInfo) {
    const t0 = Date.now();

    let hostname = URLInfo.get(url).hostname;
    if (fastStartsWith(hostname, 'www.')) {
      hostname = hostname.substr(4);
    }

    // Collect all selectors
    const tokens = new Set();
    for (let i = 0; i < nodeInfo.length; i += 1) {
      const node = nodeInfo[i];
      // For each attribute of the node: [id, tagName, className] = node
      for (let j = 0; j < node.length; j += 1) {
        tokens.add(packInt32(fastHash(node[j])));
      }
    }

    // Collect matching rules
    const rules = [];
    const checkMatch = (rule) => {
      const result = matchCosmeticFilter(rule, hostname);
      if (result !== null) {
        rules.push({
          rule,
          hostname: result.hostname,
        });
      }

      return true;
    };

    this.selectorIndex.iterMatchingFilters([...tokens], checkMatch);

    const result = this.filterExceptions(rules);
    const total = Date.now() - t0;
    logger.debug(`cosmetic rule matching ${total} ms (${tokens.size} tokens)`);

    return result;
  }
}


function processRawRequest(request) {
  // Extract hostname
  const url = request.url.toLowerCase();
  const urlParts = URLInfo.get(url);
  let hostname = urlParts.hostname;
  if (fastStartsWith(hostname, 'www.')) {
    hostname = hostname.substr(4);
  }
  const hostGD = getGeneralDomain(hostname);

  // Process source url
  const sourceUrl = request.sourceUrl;
  let sourceHostname = '';
  let sourceGD = '';
  const sourceParts = URLInfo.get(sourceUrl);

  // It can happen when source is not a valid URL, then we simply
  // leave `sourceHostname` and `sourceGD` as empty strings to allow
  // some filter matching on the request URL itself.
  if (sourceParts) {
    sourceHostname = sourceParts.hostname.toLowerCase();
    if (sourceHostname) {
      if (fastStartsWith(sourceHostname, 'www.')) {
        sourceHostname = sourceHostname.substr(4);
      }
      sourceGD = getGeneralDomain(sourceHostname);
    }
  }

  // Wrap informations needed to match the request
  return {
    tokens: tokenize(url),
    // Request
    url,
    cpt: request.cpt,
    // Source
    sourceUrl,
    sourceHostname,
    sourceGD,
    // Endpoint
    hostname,
    hostGD,
  };
}


export default class FilterEngine {
  constructor({ version, loadCosmeticFilters, loadNetworkFilters }) {
    this.version = version;
    this.loadCosmeticFilters = loadCosmeticFilters;
    this.loadNetworkFilters = loadNetworkFilters;

    this.lists = Object.create(null);
    this.resourceChecksum = null;

    this.size = 0;
    this.updated = false;

    // @@filter
    this.exceptions = new NetworkFilterBucket('exceptions');
    // $important
    this.importants = new NetworkFilterBucket('importants');
    // $redirect
    this.redirects = new NetworkFilterBucket('redirects');
    // All other filters
    this.filters = new NetworkFilterBucket('filters');
    // Cosmetic filters
    this.cosmetics = new CosmeticFilterBucket();

    // injections
    this.js = new Map();
    this.resources = new Map();
  }

  hasList(asset, checksum) {
    const list = this.lists[asset];
    if (list !== undefined) {
      return list.checksum === checksum;
    }
    return false;
  }

  collectAllFilters() {
    const allFilters = [];
    const allExceptions = [];
    const allRedirects = [];
    const allImportants = [];
    const allCosmetics = [];

    let j;
    const allLists = Object.keys(this.lists);
    for (let i = 0; i < allLists.length; i += 1) {
      const { filters
            , exceptions
            , importants
            , redirects
            , cosmetics } = this.lists[allLists[i]];

      for (j = 0; j < filters.length; j += 1) { allFilters.push(filters[j]); }
      for (j = 0; j < exceptions.length; j += 1) { allExceptions.push(exceptions[j]); }
      for (j = 0; j < importants.length; j += 1) { allImportants.push(importants[j]); }
      for (j = 0; j < redirects.length; j += 1) { allRedirects.push(redirects[j]); }
      for (j = 0; j < cosmetics.length; j += 1) { allCosmetics.push(cosmetics[j]); }
    }

    return {
      filters: allFilters,
      exceptions: allExceptions,
      redirects: allRedirects,
      importants: allImportants,
      cosmetics: allCosmetics,
      size: (
        allFilters.length +
        allExceptions.length +
        allImportants.length +
        allRedirects.length +
        allCosmetics.length
      ),
    };
  }

  onUpdateResource(updates) {
    for (let i = 0; i < updates.length; i += 1) {
      const { filters, checksum } = updates[i];

      // NOTE: Here we can only handle one resource file at a time.
      this.resourceChecksum = checksum;
      const typeToResource = parseJSResource(filters);

      // the resource containing javascirpts to be injected
      if (typeToResource.has('application/javascript')) {
        this.js = typeToResource.get('application/javascript');
      }

      // Create a mapping from resource name to { contentType, data }
      // used for request redirection.
      typeToResource.forEach((resources, contentType) => {
        resources.forEach((data, name) => {
          this.resources.set(name, {
            contentType,
            data,
          });
        });
      });
    }
  }

  onUpdateFilters(lists, loadedAssets, debug = false) {
    // Remove assets if needed
    Object.keys(this.lists).forEach((asset) => {
      if (!loadedAssets.has(asset)) {
        delete this.lists[asset];
        this.updated = true;
      }
    });

    // Mark the engine as updated, so that it will be serialized on disk
    if (lists.length > 0) {
      this.updated = true;
    }

    // Parse all filters and update `this.lists`
    for (let i = 0; i < lists.length; i += 1) {
      const { asset, filters, checksum } = lists[i];

      // Parse and dispatch filters depending on type
      const parsed = parseList(filters, {
        debug,
        loadCosmeticFilters: this.loadCosmeticFilters,
        loadNetworkFilters: this.loadNetworkFilters,
      });
      const cosmetics = parsed.cosmeticFilters;
      const networkFilters = parsed.networkFilters;

      // Network filters
      const miscFilters = [];
      const exceptions = [];
      const importants = [];
      const redirects = [];

      // Dispatch filters into their bucket
      for (let j = 0; j < networkFilters.length; j += 1) {
        const filter = networkFilters[j];
        if (filter.isException()) {
          exceptions.push(filter);
        } else if (filter.isImportant()) {
          importants.push(filter);
        } else if (filter.isRedirect()) {
          redirects.push(filter);
        } else {
          miscFilters.push(filter);
        }
      }

      this.lists[asset] = {
        checksum,
        filters: miscFilters,
        exceptions,
        importants,
        redirects,
        cosmetics,
      };
    }

    // Re-create all buckets
    const allFilters = this.collectAllFilters();

    this.size = allFilters.size;
    this.filters = new NetworkFilterBucket('filters', allFilters.filters);
    this.exceptions = new NetworkFilterBucket('exceptions', allFilters.exceptions);
    this.importants = new NetworkFilterBucket('importants', allFilters.importants);
    this.redirects = new NetworkFilterBucket('redirects', allFilters.redirects);
    this.cosmetics = new CosmeticFilterBucket(allFilters.cosmetics);
  }

  getCosmeticsFilters(url, nodes) {
    if (!this.loadCosmeticFilters) {
      return this.cosmetics.createContentScriptResponse([]);
    }

    return this.cosmetics.createContentScriptResponse(
      this.cosmetics.getMatchingRules(url, nodes)
    );
  }

  getDomainFilters(url) {
    if (!this.loadCosmeticFilters) {
      return this.cosmetics.createContentScriptResponse([]);
    }

    return this.cosmetics.createContentScriptResponse(
      this.cosmetics.getDomainRules(url, this.js)
    );
  }

  match(rawRequest) {
    if (!this.loadNetworkFilters) {
      return { match: false };
    }

    // Transforms { url, sourceUrl, cpt } into a more complete request context
    // containing domains, general domains and tokens for this request. This
    // context will be used during the matching in the engine.
    const request = processRawRequest(rawRequest);

    let result = null;
    let exception = null;

    // Check the filters in the following order:
    // 1. $important (not subject to exceptions)
    // 2. redirection ($redirect=resource)
    // 3. normal filters
    // 4. exceptions
    result = this.importants.match(request);

    if (result === null) {
      // Check if there is a redirect or a normal match
      result = this.redirects.match(request);
      if (result === null) {
        result = this.filters.match(request);
      }

      // If we found something, check for exceptions
      if (result !== null) {
        exception = this.exceptions.match(request);
        if (exception !== null) {
          result = null;
        }
      }
    }

    // If there is a match
    let filter;
    if (result !== null) {
      filter = result.pprint();
    } else if (exception !== null) {
      filter = exception.pprint();
    }

    if (result !== null) {
      if (result.redirect) {
        const { data, contentType } = this.resources.get(result.redirect);
        let dataUrl;
        if (contentType.indexOf(';') !== -1) {
          dataUrl = `data:${contentType},${data}`;
        } else {
          dataUrl = `data:${contentType};base64,${btoa(data)}`;
        }

        return {
          filter,
          match: true,
          redirect: dataUrl.trim(),
        };
      }
      return {
        filter,
        match: true
      };
    }

    return {
      filter,
      match: false,
      exception: exception !== null
    };
  }

  /**
   * Creates a string representation of the full engine. It can be stored
   * on-disk for faster loading of the adblocker. The `load` method of a
   * `FiltersEngine` instance can be used to restore the engine *in-place*.
   */
  stringify() {
    // 1. Dump all lists with their filters
    const serializedLists = Object.create(null);

    const assets = Object.keys(this.lists);
    for (let i = 0; i < assets.length; i += 1) {
      const asset = assets[i];
      const {
        checksum,
        filters,
        exceptions,
        importants,
        redirects,
        cosmetics,
      } = this.lists[asset];

      serializedLists[asset] = {
        checksum,
        filters: filters.map(f => f.serialize()),
        exceptions: exceptions.map(f => f.serialize()),
        importants: importants.map(f => f.serialize()),
        redirects: redirects.map(f => f.serialize()),
        cosmetics: cosmetics.map(f => f.serialize()),
      };
    }

    // 2. Dump all network filters buckets
    const serializedBuckets = Object.create(null);
    const buckets = [
      this.filters,
      this.exceptions,
      this.importants,
      this.redirects,
    ];
    for (let i = 0; i < buckets.length; i += 1) {
      serializedBuckets[buckets[i].name] = buckets[i].index.jsonify();
    }

    // 3. Dump cosmetic filters buckets
    serializedBuckets.cosmetics = {
      hostname: this.cosmetics.hostnameIndex.jsonify(),
      selector: this.cosmetics.selectorIndex.jsonify(),
    };

    return JSON.stringify({
      version: this.version,
      lists: serializedLists,
      buckets: serializedBuckets,
    });
  }

  /**
   * Given a valid serialized version of a `FiltersEngine` (as returned by the
   * `stringify` method), restores the engine *in-place* (override all attribute
   * byt the content of the serialized version).
   *
   * This method is faster (approximately 4x faster) than creating the engine
   * from scratch (using the raw content of the filters lists).
   */
  load(stringified) {
    const { version, lists, buckets } = JSON.parse(stringified);

    if (version !== this.version) {
      // If the version does not match, then we invalidate the engine and start fresh
      return;
    }

    // 1. deserialize lists + filters
    const networkFilters = Object.create(null); // mapping between id and filter
    const cosmeticFilters = Object.create(null); // mapping between id and filter
    const deserializedLists = Object.create(null); // engine.lists

    const assets = Object.keys(lists);
    const filtersKeys = ['filters', 'exceptions', 'redirects', 'importants'];

    // Deserialize all assets
    for (let i = 0; i < assets.length; i += 1) {
      const asset = assets[i];
      const list = lists[asset];
      const deserializedList = Object.create(null);
      deserializedList.checksum = list.checksum;

      // Network filters
      for (let j = 0; j < filtersKeys.length; j += 1) {
        const key = filtersKeys[j];
        const bucket = list[key];
        const deserializedBucket = [];
        for (let k = 0; k < bucket.length; k += 1) {
          const filter = NetworkFilter.deserialize(bucket[k]);
          networkFilters[filter.id] = filter;
          deserializedBucket.push(filter);
        }
        deserializedList[key] = deserializedBucket;
      }

      // Cosmetic filters
      const bucket = list.cosmetics;
      const deserializedBucket = [];
      for (let k = 0; k < bucket.length; k += 1) {
        const filter = CosmeticFilter.deserialize(bucket[k]);
        cosmeticFilters[filter.id] = filter;
        deserializedBucket.push(filter);
      }
      deserializedList.cosmetics = deserializedBucket;

      deserializedLists[asset] = deserializedList;
    }

    this.lists = deserializedLists;

    // 2. deserialize buckets
    this.filters.index.load(buckets.filters, networkFilters);
    this.exceptions.index.load(buckets.exceptions, networkFilters);
    this.importants.index.load(buckets.importants, networkFilters);
    this.redirects.index.load(buckets.redirects, networkFilters);

    this.cosmetics.hostnameIndex.load(
      buckets.cosmetics.hostname,
      cosmeticFilters
    );
    this.cosmetics.selectorIndex.load(
      buckets.cosmetics.selector,
      cosmeticFilters
    );
  }
}
