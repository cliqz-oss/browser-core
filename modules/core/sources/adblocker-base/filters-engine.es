import { parse } from '../tlds';
import ReverseIndex from './reverse-index';
import { tokenize, fastHash, fastStartsWith } from './utils';
import {
  parseList,
  parseJSResource,
  CosmeticFilter
} from './filters-parsing';
import {
  matchNetworkFilter,
  matchCosmeticFilter
} from './filters-matching';
import networkFiltersOptimizer from './optimizer';

import { serializeEngine } from './serialization';


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

  get size() {
    return this.index.size;
  }

  report() { return this.index.report(); }

  optimizeAheadOfTime() {
    this.index.optimizeAheadOfTime();
  }

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
        filter.hostnames.split(',').forEach((h) => {
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

  get size() {
    return this.hostnameIndex.size + this.selectorIndex.size;
  }

  optimizeAheadOfTime() { /* not implemented */ }
  report() { return ''; }

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

  getDomainRules(hostname, js) {
    /* eslint-disable no-plusplus */
    /* eslint no-param-reassign: off */
    // Collect matching rules
    const rules = [];
    const checkMatch = (rule) => {
      const result = matchCosmeticFilter(rule, hostname);
      if (result !== null) {
        // Update script injection rule
        if (rule.isScriptInject()) {
          const ruleWithScript = new CosmeticFilter(rule);
          let scriptName = rule.getSelector();
          let scriptArguments = [];
          if (scriptName.indexOf(',') !== -1) {
            const parts = scriptName.split(',');
            scriptName = parts[0];
            scriptArguments = parts.slice(1).map(s => s.trim());
          }

          let script = js.get(scriptName);
          scriptArguments.forEach((e, idx) => {
            script = script.replace(`{{${++idx}}}`, e);
          });
          ruleWithScript.selector = script;
          rules.push({
            rule: ruleWithScript,
            hostname: result.hostname,
          });
        } else {
          rules.push({
            rule,
            hostname: result.hostname,
          });
        }
      }

      return true;
    };

    this.hostnameIndex.iterMatchingFilters(tokenize(hostname), checkMatch);

    return this.filterExceptions(rules);
  }

  getMatchingRules(hostname, nodeInfo) {
    // Collect all selectors
    const tokens = new Set();
    for (let i = 0; i < nodeInfo.length; i += 1) {
      const node = nodeInfo[i];
      // For each attribute of the node: [id, tagName, className] = node
      for (let j = 0; j < node.length; j += 1) {
        tokens.add(fastHash(node[j]));
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

    return this.filterExceptions(rules);
  }
}


export function processRawRequest(request) {
  // Extract hostname
  const url = request.url.toLowerCase();
  const { hostname, domain } = parse(url);

  // Process source url
  let sourceUrl = request.sourceUrl;
  let sourceHostname = '';
  let sourceGD = '';

  if (sourceUrl) {
    // It can happen when source is not a valid URL, then we simply
    // leave `sourceHostname` and `sourceGD` as empty strings to allow
    // some filter matching on the request URL itself.
    sourceUrl = sourceUrl.toLowerCase();
    const sourceUrlParts = parse(sourceUrl);
    sourceHostname = sourceUrlParts.hostname || '';
    sourceGD = sourceUrlParts.domain || '';
  }

  // Wrap informations needed to match the request
  return {
    tokens: tokenize(url),
    cpt: request.cpt,

    // SourceUrl
    sourceUrl,
    sourceHostname,
    sourceGD,

    // Url
    url,
    hostname,
    hostGD: domain,
  };
}


export default class FilterEngine {
  constructor(options) {
    const {
      loadCosmeticFilters,
      loadNetworkFilters,
      optimizeAOT,
      version,
    } = options;

    // Options
    this.loadCosmeticFilters = loadCosmeticFilters;
    this.loadNetworkFilters = loadNetworkFilters;
    this.optimizeAOT = optimizeAOT;
    this.version = version;

    this.lists = new Map();

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

    // Injections
    this.resourceChecksum = '';
    this.js = new Map();
    this.resources = new Map();
  }

  get size() {
    return (
      this.exceptions.size +
      this.importants.size +
      this.redirects.size +
      this.cosmetics.size +
      this.filters.size
    );
  }

  hasList(asset, checksum) {
    if (this.lists.has(asset)) {
      return this.lists.get(asset).checksum === checksum;
    }
    return false;
  }

  collectAllFilters() {
    const filters = [];
    const exceptions = [];
    const redirects = [];
    const importants = [];
    const cosmetics = [];

    this.lists.forEach((list) => {
      filters.push(list.filters);
      exceptions.push(list.exceptions);
      importants.push(list.importants);
      redirects.push(list.redirects);
      cosmetics.push(list.cosmetics);
    });

    return {
      filters: [].concat(...filters),
      exceptions: [].concat(...exceptions),
      redirects: [].concat(...redirects),
      importants: [].concat(...importants),
      cosmetics: [].concat(...cosmetics),
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

  onUpdateFilters(lists, loadedAssets, onDiskCache = false, debug = false) {
    let updated = false;

    // Remove assets if needed
    this.lists.forEach((_, asset) => {
      if (!loadedAssets.has(asset)) {
        this.lists.delete(asset);
        updated = true;
      }
    });

    // Mark the engine as updated, so that it will be serialized on disk
    if (lists.length > 0) {
      updated = true;
    }

    // Parse all filters and update `this.lists`
    for (let i = 0; i < lists.length; i += 1) {
      const { asset, filters, checksum } = lists[i];

      // Parse and dispatch filters depending on type
      const { cosmeticFilters, networkFilters } = parseList(filters, {
        debug,
        loadCosmeticFilters: this.loadCosmeticFilters,
        loadNetworkFilters: this.loadNetworkFilters,
      });

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

      this.lists.set(asset, {
        checksum,
        filters: miscFilters,
        exceptions,
        importants,
        redirects,
        cosmetics: cosmeticFilters,
      });
    }

    // Re-create all buckets
    const allFilters = this.collectAllFilters();

    this.filters = new NetworkFilterBucket('filters', allFilters.filters);
    this.exceptions = new NetworkFilterBucket('exceptions', allFilters.exceptions);
    this.importants = new NetworkFilterBucket('importants', allFilters.importants);
    this.redirects = new NetworkFilterBucket('redirects', allFilters.redirects);
    this.cosmetics = new CosmeticFilterBucket(allFilters.cosmetics);

    // Serialize engine
    let serialized = null;
    if (updated && onDiskCache) {
      serialized = serializeEngine(this);
    }

    // Optimize ahead of time if asked for
    if (this.optimizeAOT) {
      this.filters.optimizeAheadOfTime();
      this.exceptions.optimizeAheadOfTime();
      this.importants.optimizeAheadOfTime();
      this.redirects.optimizeAheadOfTime();
      this.cosmetics.optimizeAheadOfTime(); // Currently a no-op
    }

    return serialized;
  }

  getCosmeticsFilters(hostname, nodes) {
    if (!this.loadCosmeticFilters) {
      return this.cosmetics.createContentScriptResponse([]);
    }

    return this.cosmetics.createContentScriptResponse(
      this.cosmetics.getMatchingRules(hostname, nodes)
    );
  }

  getDomainFilters(hostname) {
    if (!this.loadCosmeticFilters) {
      return this.cosmetics.createContentScriptResponse([]);
    }

    return this.cosmetics.createContentScriptResponse(
      this.cosmetics.getDomainRules(hostname, this.js)
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
      filter = result.toString();
    } else if (exception !== null) {
      filter = exception.toString();
    }

    if (result !== null) {
      if (result.isRedirect()) {
        const { data, contentType } = this.resources.get(result.getRedirect());
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
}
