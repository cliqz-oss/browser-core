import { URLInfo } from 'antitracking/url';

import log from 'adblocker/utils';
import parseList, { parseJSResource
                  , serializeFilter
                  , deserializeFilter } from 'adblocker/filters-parsing';
import { matchNetworkFilter
       , matchCosmeticFilter } from 'adblocker/filters-matching';
import { TLDs } from 'core/tlds';


const TOKEN_BLACKLIST = new Set([
  'com',
  'http',
  'https',
  'icon',
  'images',
  'img',
  'js',
  'net',
  'news',
  'www',
]);


function tokenizeHostname(hostname) {
  return hostname.split('.')
    .filter(token => (token &&
                      !TLDs[token] &&
                      !TOKEN_BLACKLIST.has(token)));
}


export function tokenizeURL(pattern) {
  return (pattern.match(/[a-zA-Z0-9]+/g) || []).filter(token => token.length > 1);
}


class FuzzyIndex {
  constructor(tokenizer, buildBucket, indexOnlyOne) {
    // Define tokenizer
    this.tokenizer = tokenizer;
    if (this.tokenizer === undefined) {
      this.tokenizer = (key, cb) => {
        tokenizeURL(key).forEach(cb);
      };
    }

    // Should we index with all tokens, or just one
    this.indexOnlyOne = indexOnlyOne;

    // Function used to create a new bucket
    this.buildBucket = buildBucket;
    if (this.buildBucket === undefined) {
      this.buildBucket = () => [];
    }

    // {token -> list of values}
    this.index = new Map();
    this.size = 0;
  }

  get length() {
    return this.size;
  }

  set(key, value) {
    // Only true if we insert something (we have at least 1 token)
    log(`SET ${key} => ${JSON.stringify(value)}`);
    let inserted = false;
    const insertValue = (token) => {
      log(`FOUND TOKEN ${token}`);
      if (!(this.indexOnlyOne && inserted)) {
        inserted = true;
        const bucket = this.index.get(token);
        if (bucket === undefined) {
          const newBucket = this.buildBucket(token);
          newBucket.push(value);
          this.index.set(token, newBucket);
        } else {
          bucket.push(value);
        }
      }
    };

    // Split tokens into good, common, tld
    // common: too common tokens
    // tld: corresponding to hostname extensions
    // good: anything else
    // TODO: What about trying to insert bigger tokens first?
    const goodTokens = [];
    const commonTokens = [];
    const tldTokens = [];
    this.tokenizer(key, (token) => {
      if (TOKEN_BLACKLIST.has(token)) {
        commonTokens.push(token);
      } else if (TLDs[token]) {
        tldTokens.push(token);
      } else {
        goodTokens.push(token);
      }
    });

    // Try to insert
    goodTokens.forEach(insertValue);
    if (!inserted) {
      tldTokens.forEach(insertValue);
    }
    if (!inserted) {
      commonTokens.forEach(insertValue);
    }

    if (inserted) {
      this.size += 1;
    }

    return inserted;
  }

  getFromKey(key) {
    const buckets = [];
    this.tokenizer(key, (token) => {
      const bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`BUCKET ${token} size ${bucket.length}`);
        buckets.push(bucket);
      }
    });
    return buckets;
  }

  getFromTokens(tokens) {
    const buckets = [];
    tokens.forEach((token) => {
      const bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`BUCKET ${token} size ${bucket.length}`);
        buckets.push(bucket);
      }
    });
    return buckets;
  }
}


function serializeFuzzyIndex(fi, serializeBucket) {
  const index = Object.create(null);
  fi.index.forEach((value, key) => {
    index[key] = serializeBucket(value);
  });

  return {
    i: index,
    o: fi.indexOnlyOne,
    s: fi.size,
  };
}


function deserializeFuzzyIndex(fi, serialized, deserializeBucket) {
  const { i: index, o: indexOnlyOne, s: size } = serialized;
  Object.keys(index).forEach((key) => {
    const value = index[key];
    fi.index.set(key, deserializeBucket(value));
  });

  fi.size = size;
  fi.indexOnlyOne = indexOnlyOne;
}


/* A filter reverse index is the lowest level of optimization we apply on filter
 * matching. To avoid inspecting filters that have no chance of matching, we
 * dispatch them in an index { ngram -> list of filter }.
 *
 * When we need to know if there is a match for an URL, we extract ngrams from it
 * and find all the buckets for which filters contains at list one of the ngram of
 * the URL. We then stop at the first match.
 */
class FilterReverseIndex {
  constructor(name, filters) {
    // Name of this index (for debugging purpose)
    this.name = name;

    // Remaining filters not stored in the index
    this.miscFilters = [];
    this.size = 0;

    // Tokenizer used on patterns for fuzzy matching
    this.tokenizer = (pattern, cb) => {
      pattern.split(/[*^]/g).forEach((part) => {
        tokenizeURL(part).forEach(cb);
      });
    };
    this.index = new FuzzyIndex(this.tokenizer, undefined, true);

    // Update index
    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    log(`REVERSE INDEX ${this.name} INSERT ${JSON.stringify(filter)}`);
    this.size += 1;
    let inserted = false;
    if (filter.filterStr) {
      inserted = this.index.set(filter.filterStr, filter);
    }

    if (!inserted) {
      log(`${this.name} MISC FILTER ${JSON.stringify(filter)}`);
      this.miscFilters.push(filter);
    }
  }

  matchList(request, list, checkedFilters) {
    for (let i = 0; i < list.length; i += 1) {
      const filter = list[i];
      if (!checkedFilters.has(filter.id)) {
        checkedFilters.add(filter.id);
        if (matchNetworkFilter(filter, request)) {
          log(`INDEX ${this.name} MATCH ${JSON.stringify(filter)} ~= ${request.url}`);
          return filter;
        }
      }
    }
    return null;
  }

  match(request, checkedFilters) {
    // Keep track of filters checked
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    const buckets = this.index.getFromTokens(request.tokens);

    for (const bucket of buckets) {
      log(`INDEX ${this.name} BUCKET => ${bucket.length}`);
      const result = this.matchList(request, bucket, checkedFilters);
      if (result !== null) {
        return result;
      }
    }

    log(`INDEX ${this.name} ${this.miscFilters.length} remaining filters checked`);

    // If no match found, check regexes
    return this.matchList(request, this.miscFilters, checkedFilters);
  }
}


function serializeFilterReverseIndex(fri) {
  return {
    n: fri.name,
    s: fri.size,
    m: fri.miscFilters.map(filter => filter.id),
    i: serializeFuzzyIndex(fri.index, bucket => bucket.map(filter => filter.id)),
  };
}


function deserializeFilterReverseIndex(serialized, filtersIndex) {
  const { n: name, s: size, m: miscFilters, i: index } = serialized;
  const fri = new FilterReverseIndex(name);
  fri.size = size;
  fri.miscFilters = miscFilters.map(id => filtersIndex[id]);
  deserializeFuzzyIndex(fri.index, index, bucket => bucket.map(id => filtersIndex[id]));
  return fri;
}


/* A Bucket manages a subsets of all the filters. To avoid matching too many
 * useless filters, there is a second level of dispatch here.
 *
 * [ hostname anchors (||filter) ]    [ remaining filters ]
 *
 * The first structure map { domain -> filters that apply only on domain }
 * as the `hostname anchors` only apply on a specific domain name.
 *
 * Each group of filters is stored in a Filter index that is the last level
 * of dispatch of our matching engine.
 */
class FilterHostnameDispatch {

  constructor(name, filters) {
    // TODO: Dispatch also on:
    // - fromImage
    // - fromMedia
    // - fromObject
    // - fromObjectSubrequest
    // - fromOther
    // - fromPing
    // - fromScript
    // - fromStylesheet
    // - fromXmlHttpRequest
    // To avoid matching filter if request type doesn't match
    // If we do it, we could simplify the match function of Filter

    this.name = name;
    this.size = 0;

    // ||hostname filter
    this.hostnameAnchors = new FuzzyIndex(
      // Tokenize key
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      // Create a new empty bucket
      token => new FilterReverseIndex(`${token}_${name}`),
    );

    // All other filters
    this.filters = new FilterReverseIndex(this.name);

    // Dispatch filters
    if (filters !== undefined) {
      filters.forEach(this.push.bind(this));
    }

    log(`${name} CREATE BUCKET: ${this.filters.length} filters +` +
        `${this.hostnameAnchors.size} hostnames`);
  }

  get length() {
    return this.size;
  }

  push(filter) {
    this.size += 1;

    let inserted = false;
    if (filter.hostname) {
      inserted = this.hostnameAnchors.set(filter.hostname, filter);
    }

    if (!inserted) {
      this.filters.push(filter);
    }
  }

  matchWithDomain(request, domain, checkedFilters) {
    const buckets = this.hostnameAnchors.getFromKey(domain);
    for (const bucket of buckets) {
      if (bucket !== undefined) {
        log(`${this.name} bucket try to match hostnameAnchors (${domain}/${bucket.name})`);
        const result = bucket.match(request, checkedFilters);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  }

  match(request, checkedFilters) {
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    let result = this.matchWithDomain(request, request.hostname, checkedFilters);
    if (result === null) {
      // Try to find a match with remaining filters
      log(`${this.name} bucket try to match misc`);
      result = this.filters.match(request, checkedFilters);
    }

    return result;
  }
}


function serializeFilterHostnameDispatch(fhd) {
  return {
    n: fhd.name,
    s: fhd.size,
    h: serializeFuzzyIndex(
      fhd.hostnameAnchors,
      bucket => serializeFilterReverseIndex(bucket),
    ),
    f: serializeFilterReverseIndex(fhd.filters),
  };
}


function deserializeFilterHostnameDispatch(serialized, filtersIndex) {
  const { n: name, s: size, h: hostnameAnchors, f: filters } = serialized;
  const fhd = new FilterHostnameDispatch(name);
  fhd.size = size;
  fhd.filters = deserializeFilterReverseIndex(filters, filtersIndex);
  deserializeFuzzyIndex(
    fhd.hostnameAnchors,
    hostnameAnchors,
    bucket => deserializeFilterReverseIndex(bucket, filtersIndex),
  );
  return fhd;
}


class FilterSourceDomainDispatch {
  constructor(name, filters) {
    this.name = name;
    this.size = 0;

    // Dispatch on source domain
    this.sourceDomainDispatch = new Map();
    // Filters without source domain specified
    this.miscFilters = new FilterHostnameDispatch(this.name);

    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    this.size += 1;

    if (filter.optNotDomains.length === 0 &&
        filter.optDomains.length > 0) {
      filter.optDomains.split('|').forEach((domain) => {
        log(`SOURCE DOMAIN DISPATCH ${domain} filter: ${JSON.stringify(filter)}`);
        const bucket = this.sourceDomainDispatch.get(domain);
        if (bucket === undefined) {
          const newIndex = new FilterHostnameDispatch(`${this.name}_${domain}`);
          newIndex.push(filter);
          this.sourceDomainDispatch.set(domain, newIndex);
        } else {
          bucket.push(filter);
        }
      });
    } else {
      this.miscFilters.push(filter);
    }
  }

  match(request, checkedFilters) {
    // Check bucket for source domain
    const bucket = this.sourceDomainDispatch.get(request.sourceGD);
    let result = null;
    if (bucket !== undefined) {
      log(`Source domain dispatch ${request.sourceGD} size ${bucket.length}`);
      result = bucket.match(request, checkedFilters);
    }

    if (result === null) {
      log(`Source domain dispatch misc size ${this.miscFilters.length}`);
      result = this.miscFilters.match(request, checkedFilters);
    }

    return result;
  }
}


function serializeSourceDomainDispatch(sdd) {
  const sourceDomainDispatch = Object.create(null);
  sdd.sourceDomainDispatch.forEach((value, key) => {
    sourceDomainDispatch[key] = serializeFilterHostnameDispatch(value);
  });

  return {
    sd: sourceDomainDispatch,
    m: serializeFilterHostnameDispatch(sdd.miscFilters),
    n: sdd.name,
    s: sdd.size,
  };
}


function deserializeSourceDomainDispatch(serialized, filtersIndex) {
  const { sd: sourceDomainDispatch, m: miscFilters, n: name, s: size } = serialized;
  const sdd = new FilterSourceDomainDispatch(name);

  sdd.size = size;
  sdd.miscFilters = deserializeFilterHostnameDispatch(miscFilters, filtersIndex);
  Object.keys(sourceDomainDispatch).forEach((key) => {
    const value = sourceDomainDispatch[key];
    sdd.sourceDomainDispatch.set(key, deserializeFilterHostnameDispatch(value, filtersIndex));
  });

  return sdd;
}


/**
 * Dispatch cosmetics filters on selectors
 */
class CosmeticBucket {
  constructor(name, filters) {
    this.name = name;
    this.size = 0;

    this.miscFilters = [];
    this.index = new FuzzyIndex(
      (selector, cb) => {
        selector.split(/[^#.\w_-]/g).filter(token => token.length > 0).forEach(cb);
      },
    );

    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    this.size += 1;
    const inserted = this.index.set(filter.selector, filter);

    if (!inserted) {
      this.miscFilters.push(filter);
    }
  }

  /**
   * Return element hiding rules and exception rules
   * @param {string} hostname - domain of the page.
   * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
  **/
  getMatchingRules(hostname, nodeInfo) {
    const rules = [];
    const uniqIds = new Set();

    // Deal with misc filters
    this.miscFilters
      .filter(rule => matchCosmeticFilter(rule, hostname))
      .forEach((rule) => {
        if (!uniqIds.has(rule.id)) {
          rules.push(rule);
          uniqIds.add(rule.id);
        }
      });

    // Find other matching rules in engine
    nodeInfo.forEach((node) => {
      // [id, tagName, className] = node
      node.forEach((token) => {
        this.index.getFromKey(token).forEach((bucket) => {
          bucket.forEach((rule) => {
            if (!uniqIds.has(rule.id) && matchCosmeticFilter(rule, hostname)) {
              rules.push(rule);
              uniqIds.add(rule.id);
            }
          });
        });
      });
    });

    const matchingRules = {};
    function addRule(rule, matchingHost, exception) {
      const value = { rule, matchingHost, exception };
      if (rule.selector in matchingRules) {
        const oldMatchingHost = matchingRules[rule.selector].matchingHost;
        if (matchingHost.length > oldMatchingHost.length) {
          matchingRules[rule.selector] = value;
        }
      } else {
        matchingRules[rule.selector] = value;
      }
    }

    // filter by hostname
    rules.forEach((rule) => {
      if (rule.hostnames.length === 0) {
        addRule(rule, '', false);
      } else {
        rule.hostnames.forEach((h) => {
          let exception = false;
          if (h.startsWith('~')) {
            exception = true;
            h = h.substr(1);
          }
          if (rule.unhide) {
            exception = true;
          }
          if (hostname === h || hostname.endsWith(`.${h}`)) {
            addRule(rule, h, exception);
          }
        });
      }
    });

    return matchingRules;
  }
}


function serializeCosmeticBucket(cb) {
  return {
    n: cb.name,
    s: cb.size,
    m: cb.miscFilters.map(filter => filter.id),
    i: serializeFuzzyIndex(cb.index, bucket => bucket.map(filter => filter.id)),
  };
}


function deserializeCosmeticBucket(serialized, filtersIndex) {
  const { n: name, s: size, m: miscFilters, i: index } = serialized;
  const cb = new CosmeticBucket(name);
  cb.size = size;
  cb.miscFilters = miscFilters.map(id => filtersIndex[id]);
  deserializeFuzzyIndex(cb.index, index, bucket => bucket.map(id => filtersIndex[id]));
  return cb;
}


class CosmeticEngine {
  constructor(filters) {
    this.size = 0;

    this.miscFilters = new CosmeticBucket('misc');
    this.cosmetics = new FuzzyIndex(
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      token => new CosmeticBucket(`${token}_cosmetics`),
    );

    if (filters) {
      filters.forEach(filter => this.push(filter));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    let inserted = false;
    this.size += 1;

    if (filter.hostnames.length > 0) {
      filter.hostnames.forEach((hostname) => {
        inserted = this.cosmetics.set(hostname, filter) || inserted;
      });
    }

    if (!inserted) {
      this.miscFilters.push(filter);
    }
  }

  /**
   * Return a list of potential cosmetics filters
   *
   * @param {string} url - url of the page.
   * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
  **/
  getMatchingRules(url, nodeInfo) {
    const uniqIds = new Set();
    const rules = [];
    let hostname = URLInfo.get(url).hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substr(4);
    }
    log(`getMatchingRules ${url} => ${hostname} (${JSON.stringify(nodeInfo)})`);

    // Check misc bucket
    const miscMatchingRules = this.miscFilters.getMatchingRules(hostname, nodeInfo);

    // Check hostname buckets
    this.cosmetics.getFromKey(hostname).forEach((bucket) => {
      log(`Found bucket ${bucket.size}`);
      const matchingRules = bucket.getMatchingRules(hostname, nodeInfo);
      Object.keys(matchingRules).forEach((selector) => {
        const r = matchingRules[selector];
        if (!r.exception && !uniqIds.has(r.rule.id)) {
          rules.push(r.rule);
          uniqIds.add(r.rule.id);
        } else if (selector in miscMatchingRules) {  // handle exception rules
          delete miscMatchingRules[selector];
        }
      });
    });

    Object.keys(miscMatchingRules).forEach((selector) => {
      rules.push(miscMatchingRules[selector].rule);
    });

    log(`COSMETICS found ${rules.length} potential rules for ${url}`);
    return rules;
  }

  /**
   * Return all the cosmetic filters on a domain
   *
   * @param {string} url - url of the page
  **/
  getDomainRules(url, js) {
    const hostname = URLInfo.get(url).hostname;
    const rules = [];
    const uniqIds = new Set();
    log(`getDomainRules ${url} => ${hostname}`);
    this.cosmetics.getFromKey(hostname).forEach((bucket) => {
      for (const value of bucket.index.index.values()) {
        value.forEach((rule) => {
          if (!uniqIds.has(rule.id)) {
            // check if one of the preceeding rules has the same selector
            const selectorMatched = rules.find(r => r.unhide !== rule.unhide && r.selector === rule.selector);
            if (!selectorMatched) {
              // if not then check if it should be added to the rules
              if (rule.scriptInject) {
                // make sure the selector was replaced by javascript
                if (!rule.scriptReplaced) {
                  if (rule.selector.includes(',')) {
                    rule.scriptArguments = rule.selector.split(',').slice(1).map(String.trim);
                    rule.selector = rule.selector.split(',')[0];
                  }
                  rule.selector = js.get(rule.selector);
                  if (rule.scriptArguments) {
                    rule.scriptArguments.forEach((e, idx) => {
                      rule.selector = rule.selector.replace('{{' + ++idx + '}}', e);
                    });
                  }
                  rule.scriptReplaced = true;
                }
              }
              if (rule.selector) {
                rules.push(rule);
                uniqIds.add(rule.id);
              }
            } else {
              // otherwise, then this implies that the two rules
              // negating each others and should be removed
              rules.splice(rules.indexOf(selectorMatched), 1);
              uniqIds.add(rule.id);
            }
          }
        });
      }
    });
    return rules;
  }
}


function serializeCosmeticEngine(cosmetics) {
  return {
    s: cosmetics.size,
    m: serializeCosmeticBucket(cosmetics.miscFilters),
    c: serializeFuzzyIndex(cosmetics.cosmetics, serializeCosmeticBucket),
  };
}


function deserializeCosmeticEngine(engine, serialized, filtersIndex) {
  const { s: size, m: miscFilters, c: cosmetics } = serialized;
  engine.size = size;
  engine.miscFilters = deserializeCosmeticBucket(miscFilters, filtersIndex);
  deserializeFuzzyIndex(
    engine.cosmetics,
    cosmetics,
    bucket => deserializeCosmeticBucket(bucket, filtersIndex),
  );
}


/* Manage a list of filters and match them in an efficient way.
 * To avoid inspecting to many filters for each request, we create
 * the following accelerating structure:
 *
 * [ Importants ]    [ Exceptions ] [ Redirect ] [ Remaining filters ]
 *
 * Each of theses is a `FilterHostnameDispatch`, which manage a subset of filters.
 *
 * Importants filters are not subject to exceptions, hence we try it first.
 * If no important filter matched, try to use the remaining filters bucket.
 * If we have a match, try to find an exception.
 */
export default class {
  constructor() {
    this.lists = new Map();
    this.resourceChecksum = null;

    this.size = 0;
    this.updated = false;

    // *************** //
    // Network filters //
    // *************** //

    // @@filter
    this.exceptions = new FilterSourceDomainDispatch('exceptions');
    // $important
    this.importants = new FilterSourceDomainDispatch('importants');
    // $redirect
    this.redirect = new FilterSourceDomainDispatch('redirect');
    // All other filters
    this.filters = new FilterSourceDomainDispatch('filters');

    // ***************** //
    // Cosmetic filters  //
    // ***************** //

    this.cosmetics = new CosmeticEngine();

    // injections
    this.js = new Map();
    this.resources = new Map();
  }

  hasList(asset, checksum) {
    if (this.lists.has(asset)) {
      return this.lists.get(asset).checksum === checksum;
    }
    return false;
  }

  onUpdateResource(updates) {
    updates.forEach((resource) => {
      const { filters, checksum } = resource;

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
    });
  }

  onUpdateFilters(lists, debug = false) {
    // Mark the engine as updated, so that it will be serialized on disk
    if (lists.length > 0) {
      this.updated = true;
    }

    // Check if one of the list is an update to an existing list
    let update = false;
    lists.forEach((list) => {
      const { asset } = list;
      if (this.lists.has(asset)) {
        update = true;
      }
    });

    // Parse all filters and update `this.lists`
    lists.forEach((list) => {
      const { asset, filters, checksum } = list;

      // Network filters
      const miscFilters = [];
      const exceptions = [];
      const importants = [];
      const redirect = [];

      // Parse and dispatch filters depending on type
      const parsed = parseList(filters, debug);

      // Cosmetic filters
      const cosmetics = parsed.cosmeticFilters;

      parsed.networkFilters.forEach((filter) => {
        if (filter.isException) {
          exceptions.push(filter);
        } else if (filter.isImportant) {
          importants.push(filter);
        } else if (filter.redirect) {
          redirect.push(filter);
        } else {
          miscFilters.push(filter);
        }
      });

      this.lists.set(asset, {
        checksum,
        filters: miscFilters,
        exceptions,
        importants,
        redirect,
        cosmetics,
      });
    });


    // Update the engine with new rules

    if (update) {
      // If it's an update then recreate the whole engine
      const allFilters = {
        filters: [],
        exceptions: [],
        importants: [],
        redirect: [],
        cosmetics: [],
      };

      let newSize = 0;
      this.lists.forEach((list) => {
        Object.keys(list)
          .filter(key => list[key] instanceof Array)
          .forEach((key) => {
            list[key].forEach((filter) => {
              newSize += 1;
              allFilters[key].push(filter);
            });
          });
      });

      this.size = newSize;
      this.filters = new FilterSourceDomainDispatch('filters', allFilters.filters);
      this.exceptions = new FilterSourceDomainDispatch('exceptions', allFilters.exceptions);
      this.importants = new FilterSourceDomainDispatch('importants', allFilters.importants);
      this.redirect = new FilterSourceDomainDispatch('redirect', allFilters.redirect);
      this.cosmetics = new CosmeticEngine(allFilters.cosmetics);
    } else {
      // If it's not an update, just add new lists in engine.
      lists.forEach((list) => {
        const { asset } = list;
        const { filters
              , exceptions
              , importants
              , redirect
              , cosmetics } = this.lists.get(asset);

        this.size += (filters.length +
                      exceptions.length +
                      redirect.length +
                      importants.length +
                      cosmetics.length);

        filters.forEach(this.filters.push.bind(this.filters));
        exceptions.forEach(this.exceptions.push.bind(this.exceptions));
        importants.forEach(this.importants.push.bind(this.importants));
        redirect.forEach(this.redirect.push.bind(this.redirect));
        cosmetics.forEach(this.cosmetics.push.bind(this.cosmetics));
      });
    }
  }

  getCosmeticsFilters(url, nodes) {
    return this.cosmetics.getMatchingRules(url, nodes);
  }

  getDomainFilters(url) {
    return this.cosmetics.getDomainRules(url, this.js);
  }

  match(request) {
    log(`MATCH ${JSON.stringify(request)}`);
    request.tokens = tokenizeURL(request.url);

    const checkedFilters = new Set();
    let result = null;

    // Check the filters in the following order:
    // 1. redirection ($redirect=resource)
    // 2. $important (not subject to exceptions)
    // 3. normal filters
    // 4. exceptions
    result = this.redirect.match(request, checkedFilters);
    if (result === null) {
      result = this.importants.match(request, checkedFilters);
      if (result === null) {
        result = this.filters.match(request, checkedFilters);
        if (result !== null) {
          if (this.exceptions.match(request, checkedFilters)) {
            result = null;
          }
        }
      }
    }

    log(`Total filters ${checkedFilters.size}`);
    if (result !== null) {
      if (result.redirect) {
        const { data, contentType } = this.resources.get(result.redirect);
        let dataUrl;
        if (contentType.includes(';')) {
          dataUrl = `data:${contentType},${data}`;
        } else {
          dataUrl = `data:${contentType};base64,${btoa(data)}`;
        }

        return {
          match: true,
          redirect: dataUrl.trim(),
        };
      }
      return { match: true };
    }

    return { match: false };
  }
}


function checkEngineRec(serialized, validFilterIds) {
  Object.keys(serialized)
    .filter(key => key !== 's')
    .forEach((key) => {
      const value = serialized[key];
      if (typeof value === 'number') {
        if (validFilterIds[value] === undefined) {
          throw new Error(`Filter ${serialized} was not found in serialized engine`);
        }
      } else if (typeof value === 'object') {
        checkEngineRec(value, validFilterIds);
      }
    });
}


function serializedEngineSanityCheck(serialized) {
  const { cosmetics
        , filtersIndex
        , exceptions
        , importants
        , redirect
        , filters } = serialized;

  [cosmetics, exceptions, importants, redirect, filters].forEach((bucket) => {
    checkEngineRec(bucket, filtersIndex);
  });
}


export function serializeFiltersEngine(engine, adbVersion, checkEngine = false) {
  // Create a global index of filters to avoid redundancy
  // From `engine.lists` create a mapping: uid => filter
  const filters = Object.create(null);
  engine.lists.forEach((entry) => {
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        entry[key].forEach((filter) => {
          filters[filter.id] = serializeFilter(filter);
        });
      });
  });

  // Serialize `engine.lists` but replacing each filter by its uid
  const lists = Object.create(null);
  engine.lists.forEach((entry, asset) => {
    lists[asset] = { checksum: entry.checksum };
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        lists[asset][key] = entry[key].map(filter => filter.id);
      });
  });


  const serializedEngine = {
    version: adbVersion,
    cosmetics: serializeCosmeticEngine(engine.cosmetics),
    filtersIndex: filters,
    size: engine.size,
    lists,
    exceptions: serializeSourceDomainDispatch(engine.exceptions),
    importants: serializeSourceDomainDispatch(engine.importants),
    redirect: serializeSourceDomainDispatch(engine.redirect),
    filters: serializeSourceDomainDispatch(engine.filters),
  };

  if (checkEngine) {
    serializedEngineSanityCheck(serializedEngine);
  }

  return serializedEngine;
}


export function deserializeFiltersEngine(engine, serialized, adbVersion, checkEngine = false) {
  if (checkEngine) {
    serializedEngineSanityCheck(serialized);
  }

  const { version
        , cosmetics
        , filtersIndex
        , size
        , lists
        , exceptions
        , importants
        , redirect
        , filters } = serialized;

  if (version !== adbVersion) {
    // If the version does not match, then we invalidate the engine and start fresh
    return;
  }

  // Deserialize filters index
  const filtersReverseIndex = Object.create(null);
  Object.keys(filtersIndex).forEach((id) => {
    filtersReverseIndex[id] = deserializeFilter(filtersIndex[id]);
  });

  // Deserialize engine.lists
  Object.keys(lists).forEach((asset) => {
    const entry = lists[asset];
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        entry[key] = entry[key].map(id => filtersReverseIndex[id]);
      });
    engine.lists.set(asset, entry);
  });

  // Deserialize cosmetic engine and filters
  deserializeCosmeticEngine(engine.cosmetics, cosmetics, filtersReverseIndex);
  engine.exceptions = deserializeSourceDomainDispatch(exceptions, filtersReverseIndex);
  engine.importants = deserializeSourceDomainDispatch(importants, filtersReverseIndex);
  engine.redirect = deserializeSourceDomainDispatch(redirect, filtersReverseIndex);
  engine.filters = deserializeSourceDomainDispatch(filters, filtersReverseIndex);
  engine.size = size;
}
