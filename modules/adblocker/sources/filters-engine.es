import { TLDs } from 'antitracking/domain';
import { URLInfo } from 'antitracking/url';

import { log } from 'adblocker/utils';
import parseList, { parseJSResource } from 'adblocker/filters-parsing';
import match from 'adblocker/filters-matching';


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
  return pattern.match(/[a-zA-Z0-9]+/g) || [];
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
    log(`SET ${key}`);
    let inserted = false;
    const insertValue = token => {
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
    this.tokenizer(key, token => {
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
    this.tokenizer(key, token => {
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
    tokens.forEach(token => {
      const bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`BUCKET ${token} size ${bucket.length}`);
        buckets.push(bucket);
      }
    });
    return buckets;
  }
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
      pattern.split(/[*^]/g).forEach(part => {
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
    log(`REVERSE INDEX ${this.name} INSERT ${filter.rawLine}`);
    ++this.size;
    const inserted = this.index.set(filter.filterStr, filter);

    if (!inserted) {
      log(`${this.name} MISC FILTER ${filter.rawLine}`);
      this.miscFilters.push(filter);
    }
  }

  matchList(request, list, checkedFilters) {
    for (let i = 0; i < list.length; i++) {
      const filter = list[i];
      if (!checkedFilters.has(filter.id)) {
        checkedFilters.add(filter.id);
        if (match(filter, request)) {
          log(`INDEX ${this.name} MATCH ${filter.rawLine} ~= ${request.url}`);
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
      if (this.matchList(request, bucket, checkedFilters) !== null) {
        return true;
      }
    }

    log(`INDEX ${this.name} ${this.miscFilters.length} remaining filters checked`);

    // If no match found, check regexes
    return this.matchList(request, this.miscFilters, checkedFilters) !== null;
  }
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
      token => new FilterReverseIndex(`${token}_${name}`)
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
    ++this.size;

    log(`PUSH ${filter.rawLine}`);
    if (filter.hostname !== null) {
      this.hostnameAnchors.set(filter.hostname, filter);
    } else {
      this.filters.push(filter);
    }
  }

  matchWithDomain(request, domain, checkedFilters) {
    const buckets = this.hostnameAnchors.getFromKey(domain);
    for (const bucket of buckets) {
      if (bucket !== undefined) {
        log(`${this.name} bucket try to match hostnameAnchors (${domain}/${bucket.name})`);
        if (bucket.match(request, checkedFilters)) {
          return true;
        }
      }
    }

    return false;
  }

  match(request, checkedFilters) {
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    if (this.matchWithDomain(request, request.hostname, checkedFilters)) {
      return true;
    }

    // Try to find a match with remaining filters
    log(`${this.name} bucket try to match misc`);
    return this.filters.match(request, checkedFilters);
  }
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
    ++this.size;

    if (filter.optNotDomains === null &&
        filter.optDomains !== null) {
      filter.optDomains.forEach(domain => {
        log(`SOURCE DOMAIN DISPATCH ${domain} filter: ${filter.rawLine}`);
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
    let foundMatch = false;
    if (bucket !== undefined) {
      log(`Source domain dispatch ${request.sourceGD} size ${bucket.length}`);
      foundMatch = bucket.match(request, checkedFilters);
    }

    if (!foundMatch) {
      log(`Source domain dispatch misc size ${this.miscFilters.length}`);
      foundMatch = this.miscFilters.match(request, checkedFilters);
    }

    return foundMatch;
  }
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
      }
    );

    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    ++this.size;
    const inserted = this.index.set(filter.selector, filter);

    if (!inserted) {
      log(`${this.name} MISC FILTER ${filter.rawLine}`);
      this.miscFilters.push(filter);
    }
  }

  /**
   * Return element hiding rules and exception rules
   * @param {string} hostname - domain of the page.
   * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
  **/
  getMatchingRules(hostname, nodeInfo) {
    const rules = [...this.miscFilters];
    const uniqIds = new Set();

    nodeInfo.forEach(node => {
      // [id, tagName, className] = node
      node.forEach(token => {
        this.index.getFromKey(token).forEach(bucket => {
          bucket.forEach(rule => {
            if (!uniqIds.has(rule.id)) {
              rules.push(rule);
              uniqIds.add(rule.id);
            }
          });
        });
      });
    });

    const matchingRules = {};
    function addRule(rule, matchingHost, exception) {
      if (rule.selector in matchingRules) {
        const oldMatchingHost = matchingRules[rule.selector].matchingHost;
        if (matchingHost.length > oldMatchingHost.length) {
          matchingRules[rule.selector] = {
            rule,
            exception,
            matchingHost,
          };
        }
      } else {
        matchingRules[rule.selector] = {
          rule,
          exception,
          matchingHost,
        };
      }
    }

    // filter by hostname
    if (hostname !== '') {
      rules.forEach(rule => {
        rule.hostnames.forEach(h => {
          let exception = false;
          if (h.startsWith('~')) {
            exception = true;
            h = h.substr(1);
          }
          if (hostname === h || hostname.endsWith(`.${h}`)) {
            addRule(rule, h, exception);
          }
        });
      });
    } else {  // miscFilters
      rules.forEach(rule => {
        addRule(rule, '', false);
      });
    }

    return matchingRules;
  }
}


class CosmeticEngine {
  constructor() {
    this.size = 0;

    this.miscFilters = new CosmeticBucket('misc');
    this.cosmetics = new FuzzyIndex(
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      token => new CosmeticBucket(`${token}_cosmetics`)
    );
  }

  get length() {
    return this.size;
  }

  push(filter) {
    if (filter.hostnames.length === 0) {
      this.miscFilters.push(filter);
    } else {
      filter.hostnames.forEach(hostname => {
        this.cosmetics.set(hostname, filter);
      });
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
    const miscRules = {};
    const rules = [];
    let hostname = URLInfo.get(url).hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substr(4);
    }
    log(`getMatchingRules ${url} => ${hostname} (${JSON.stringify(nodeInfo)})`);

    // Check misc bucket
    const miscMatchingRules = this.miscFilters.getMatchingRules('', nodeInfo);

    // Check hostname buckets
    this.cosmetics.getFromKey(hostname).forEach(bucket => {
      log(`Found bucket ${bucket.size}`);
      const matchingRules = bucket.getMatchingRules(hostname, nodeInfo);
      Object.keys(matchingRules).forEach(selector => {
        const r = matchingRules[selector];
        if (!r.exception && !uniqIds.has(r.rule.id)) {
          rules.push(r.rule);
          uniqIds.add(r.rule.id);
        } else if (selector in miscRules) {  // handle exception rules
          delete miscMatchingRules[selector];
        }
      });
    });

    Object.keys(miscMatchingRules).forEach(selector => {
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
    this.cosmetics.getFromKey(hostname).forEach(bucket => {
      for (const value of bucket.index.index.values()) {
        value.forEach(rule => {
          if (!uniqIds.has(rule.id)) {
            if (rule.scriptInject) {
              // make sure the selector was replaced by javascript
              if (!rule.scriptReplaced) {
                rule.selector = js.get(rule.selector);
                rule.scriptReplaced = true;
              }
            }
            if (rule.selector) {
              rules.push(rule);
              uniqIds.add(rule.id);
            }
          }
        });
      }
    });
    return rules;
  }
}


/* Manage a list of filters and match them in an efficient way.
 * To avoid inspecting to many filters for each request, we create
 * the following accelerating structure:
 *
 * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
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
    this.size = 0;

    // *************** //
    // Network filters //
    // *************** //

    // @@filter
    this.exceptions = new FilterSourceDomainDispatch('exceptions');
    // $important
    this.importants = new FilterSourceDomainDispatch('importants');
    // All other filters
    this.filters = new FilterSourceDomainDispatch('filters');

    // ***************** //
    // Cosmetic filters  //
    // ***************** //

    this.cosmetics = new CosmeticEngine();

    // injections
    this.js = new Map();
  }

  onUpdateResource(asset, data) {
    // the resource containing javascirpts to be injected
    const js = parseJSResource(data).get('application/javascript');
    // TODO: handle other type
    if (js) {
      this.js = js;
    }
  }

  onUpdateFilters(asset, newFilters) {
    // Network filters
    const filters = [];
    const exceptions = [];
    const importants = [];

    // Cosmetic filters
    const cosmetics = [];

    // Parse and dispatch filters depending on type
    const parsed = parseList(newFilters);

    parsed.networkFilters.forEach(filter => {
      log(`ADD TO ENGINE ${filter}`);
      if (filter.isException) {
        exceptions.push(filter);
      } else if (filter.isImportant) {
        importants.push(filter);
      } else {
        filters.push(filter);
      }
    });

    parsed.cosmeticFilters.forEach(filter => {
      cosmetics.push(filter);
    });

    if (!this.lists.has(asset)) {
      log(`FILTER ENGINE ${asset} UPDATE`);
      // If this is the first time we add this list => update data structures
      this.size += filters.length + exceptions.length + importants.length + cosmetics.length;
      filters.forEach(this.filters.push.bind(this.filters));
      exceptions.forEach(this.exceptions.push.bind(this.exceptions));
      importants.forEach(this.importants.push.bind(this.importants));
      cosmetics.forEach(this.cosmetics.push.bind(this.cosmetics));

      this.lists.set(asset, { filters, exceptions, importants, cosmetics });
    } else {
      log(`FILTER ENGINE ${asset} REBUILD`);
      // Rebuild everything since this is an update for an existing list
      for (const list of this.lists.values()) {
        list.filters.forEach(filters.push.bind(filters));
        list.exceptions.forEach(exceptions.push.bind(exceptions));
        list.importants.forEach(importants.push.bind(importants));
        list.cosmetics.forEach(cosmetics.push.bind(cosmetics));
      }

      this.size = filters.length + exceptions.length + importants.length + cosmetics.length;
      this.filters = new FilterSourceDomainDispatch('filters', filters);
      this.exceptions = new FilterSourceDomainDispatch('exceptions', exceptions);
      this.importants = new FilterSourceDomainDispatch('importants', importants);
      this.cosmetics = new CosmeticEngine(cosmetics);
    }

    log(`Filter engine updated with ${filters.length} filters, ` +
        `${exceptions.length} exceptions, ` +
        `${importants.length} importants and ` +
        `${cosmetics.length} cosmetic filters`);
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
    let result = false;

    if (this.importants.match(request, checkedFilters)) {
      log('IMPORTANT');
      result = true;
    } else if (this.filters.match(request, checkedFilters)) {
      log('FILTER');
      if (this.exceptions.match(request, checkedFilters)) {
        log('EXCEPTION');
        result = false;
      } else {
        result = true;
      }
    }

    log(`Total filters ${checkedFilters.size}`);
    return result;
  }
}
