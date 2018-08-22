import logger from './logger';
import { parseURL } from './network';
import config from '../core/config';

export function parseQueryString(query) {
  if (query.length === 0) {
    return {};
  }
  const queryParts = query.replace(/;/g, '&').split('&');
  const q = {};
  for (const pair of queryParts) {
    const [key_, value] = pair.split('=', 2);
    const key = unescape(key_);
    if (!q[key]) {
      q[key] = [];
    }
    if (value) {
      q[key].push(unescape(value));
    } else {
      q[key].push(true);
    }
  }
  return q;
}

// helper function to implement the "splitF" function
// (part of the DSL used in the patterns description)
function refineSplitFunc(splitString, splitON, arrPos) {
  const result = splitString.split(splitON)[arrPos];
  if (result) {
    return decodeURIComponent(result);
  }
  return decodeURIComponent(splitString);
}

// helper function to implement the "parseU" function
// (part of the DSL used in the patterns description)
function refineParseURIFunc(url, extractType, keyName) {
  const urlParts = parseURL(url);
  if (urlParts && urlParts.query_string) {
    const parseResult = parseQueryString(urlParts.query_string);
    if (extractType === 'qs') {
      if (parseResult[keyName]) {
        return decodeURIComponent(parseResult[keyName][0]);
      }
      return url;
    }
    // For now, leave the old semantic.
    // TODO: Probably, we should return "url" here.
    return undefined;
  }

  return url;
}

// (exported for tests only)
export function _mergeArr(arrS) {
  const messageList = [];
  const allKeys = Object.keys(arrS);

  // assumption: all keys have the same number of elements
  const elemsPerKey = arrS[allKeys[0]].length;
  for (let i = 0; i < elemsPerKey; i += 1) {
    const innerDict = {};
    for (const e of allKeys) {
      innerDict[e] = arrS[e][i];
    }
    messageList.push(innerDict);
  }
  return messageList;
}

/**
 * This class is responsible for most of the data collection
 * from HTML pages.
 *
 * Internally, it has a list of patterns that describe how to
 * find the information, and what type and fields the resulting message
 * should have. The pattern definition itself is fetched from the server.
 *
 * Be careful: code and rules are released separately. That is intended
 * as we need to be able to quickly react on changes to the HTML structure
 * by pushing new patterns (without waiting for releases).
 *
 * That has two consequences:
 *
 * 1) client-side:
 *    The code in the navigation extension should not make too strong
 *    assumptions about the rules themself. Unnecessary assumptions can make it
 *    later more difficult to push new rules. Also be prepared to handle errors
 *    gracefully.
 *
 * 2) server-side:
 *    When you release new rules, it should not break core functionality
 *    of older clients.
 *
 *    Note: In general, that should be not an issue, as long as the clients
 *    handle errors properly. In the worst case, you will then break data
 *    collection, but that it is more of a trade-off.
 *    Breaking data collections in old clients is acceptable, as long as
 *    the percentage of affected clients is low enough.
 *
 * As the outside world is not static, rules that worked the day before might
 * suddenly break. Expect that the structure of HTML pages will change.
 *
 * To detect breakage, you can monitor the collected events that we
 * receive on the server. Typically, if the structure of a page changes,
 * there is a sudden drop of incoming messages for that specific type.
 */
export class ContentExtractor {
  /**
   * Note: In production, _CliqzHumanWeb will be the global CliqzHumanWeb object.
   */
  constructor(_CliqzHumanWeb) {
    this._CliqzHumanWeb = _CliqzHumanWeb;
    this.msgType = _CliqzHumanWeb.msgType;

    // Patterns for content extraction.
    // Will be initialized by the ContentExtractionPatternsLoader,
    // which polls for configuration changes from the backend.
    //
    // Even before the rules are loaded, you can immediately use the class.
    // There will be no errors, but as the rules are empty, it will not
    // be able to collect any data.
    //
    this.patterns = {
      normal: {
        searchEngines: [],
        rArray: [],
        extractRules: {},
        payloads: {},
        queryTemplate: {},
      },
      strict: {
        searchEngines: [],
        rArray: [],
        extractRules: {},
        payloads: {},
        queryTemplate: {},
      }
    };

    // TODO: maskURL depends heavily on CliqzHumanWeb functionality.
    // Could also be extracted to another file, but that is a
    // non-trivial change. For now leave the dependence to CliqzHumanWeb.
    this.refineFuncMappings = {
      splitF: refineSplitFunc,
      parseU: refineParseURIFunc,
      maskU: url => this._CliqzHumanWeb.maskURL(url),
    };

    // TODO: can this state be avoided?!
    this._messageTemplate = {};
  }

  /**
   * Update content extraction patterns with the latest one from the backend.
   */
  updatePatterns(patternConfig, ruleset) {
    this.patterns[ruleset] = {
      searchEngines: patternConfig.searchEngines,
      extractRules: patternConfig.scrape,
      payloads: patternConfig.payloads,
      idMappings: patternConfig.idMapping,
      rArray: config.settings.ALLOWED_SEARCH_DOMAINS[ruleset].map(x => new RegExp(x)),
      queryTemplate: patternConfig.queryTemplate || {},
    };
    this._patternsLastUpdated = new Date();
    logger.debug(`Successfully updated "${ruleset}" patterns at ${this._patternsLastUpdated}`);
  }

  checkURL(pageContent, url, ruleset) {
    const patterns = this.patterns[ruleset];
    const rArray = patterns.rArray;
    const searchEngines = patterns.searchEngines;

    for (let i = 0; i < rArray.length; i += 1) {
      if (rArray[i].test(url)) {
        this._extractContent(i, pageContent, url, ruleset);

        // Do not want to continue after search engines...
        if (searchEngines.indexOf(String(i)) !== -1) {
          return;
        }
        if (this._CliqzHumanWeb.debug) {
          logger.debug('Continue further after search engines ');
        }
      }
    }
  }

  /**
   * True if the url matches one of the known search engines
   * (as defined by the loaded patterns).
   */
  isSearchEngineUrl(url) {
    return this._checkSearchURL(url, 'normal') !== -1;
  }

  // construct the doublefetch URL for the given query
  _createAnonSearchQuery(hostname, query, searchEngineIdx) {
    const template = this.patterns.strict.queryTemplate[String(searchEngineIdx)] || {};

    let queryPrefix = template.prefix;
    if (queryPrefix === undefined) {
      // fallback for old patterns
      queryPrefix = 'search?q=';
    }

    return `https://${hostname}/${queryPrefix}${query}`;
  }

  checkAnonSearchURL(url, query) {
    const index = this._checkSearchURL(url, 'strict');
    if (index === -1) {
      return { isSearchEngineUrl: false };
    }

    const { hostname } = parseURL(url);
    const queryUrl = this._createAnonSearchQuery(hostname, query, index);

    if (parseURL(queryUrl).hostname !== hostname) {
      // paranoid check: should not be possible to reach
      throw new Error('refusing to make a request to another host');
    }
    return { isSearchEngineUrl: true, queryUrl };
  }

  _checkSearchURL(url, ruleset) {
    const patterns = this.patterns[ruleset];
    const searchEngines = patterns.searchEngines;
    const rArray = patterns.rArray;

    for (let i = 0; i < rArray.length; i += 1) {
      if (rArray[i].test(url)) {
        if (searchEngines.indexOf(String(i)) !== -1) {
          return i;
        }

        if (this._CliqzHumanWeb.debug) {
          logger.debug(`Not search engine >>> url=${url}, i=${i}, searchEngines=${searchEngines}, ruleset=${ruleset}`);
        }
        return -1;
      }
    }
    return -1;
  }

  _extractContent(ind, cd, url, ruleset) {
    const scrapeResults = {};

    const patterns = this.patterns[ruleset];
    const rules = patterns.extractRules[ind];
    const payloadRules = patterns.payloads[ind];
    const idMappings = patterns.idMappings[ind];

    let urlArray = [];
    for (const key of Object.keys(rules)) {
      const innerDict = {};
      for (const eachKey of Object.keys(rules[key])) {
        if (rules[key][eachKey].type === 'standard') {
          // Depending on etype, currently only supporting url. Maybe ctry too.
          if (rules[key][eachKey].etype === 'url') {
            let qurl = url;
            const functionsApplied = rules[key][eachKey].functionsApplied || null;
            // Check if the value needs to be refined or not.
            if (functionsApplied) {
              qurl = functionsApplied.reduce((attribVal, e) => {
                if (Object.prototype.hasOwnProperty.call(this.refineFuncMappings, e[0])) {
                  return this.refineFuncMappings[e[0]](attribVal, e[1], e[2]);
                }
                return attribVal;
              }, qurl);
            }
            innerDict[eachKey] = [qurl];
          }

          if (rules[key][eachKey].etype === 'ctry') {
            innerDict[eachKey] = [this._CliqzHumanWeb.getCountryCode()];
          }
        } else if (rules[key][eachKey].type === 'searchQuery') {
          urlArray = this._getAttribute(
            cd, key,
            rules[key][eachKey].item,
            rules[key][eachKey].etype,
            rules[key][eachKey].keyName,
            rules[key][eachKey].functionsApplied || null);
          innerDict[eachKey] = urlArray;
          if (ruleset === 'normal') {
            logger.debug('Populating query Cache <<<< ', url, ' >>>> ', urlArray[0]);
            this._CliqzHumanWeb.addStrictQueries(url, urlArray[0]);

            this._CliqzHumanWeb.queryCache[url] = {
              d: 0,
              q: urlArray[0],
              t: idMappings
            };
          } else {
            // TODO: Do we have to recompute here? Can urlArray change?
            // For now, leave the logic, but at a first glance it seems unnecessary.
            urlArray = this._getAttribute(
              cd, key,
              rules[key][eachKey].item,
              rules[key][eachKey].etype,
              rules[key][eachKey].keyName,
              rules[key][eachKey].functionsApplied || null);
            innerDict[eachKey] = urlArray;
          }
        } else {
          urlArray = this._getAttribute(
            cd, key,
            rules[key][eachKey].item,
            rules[key][eachKey].etype,
            rules[key][eachKey].keyName,
            rules[key][eachKey].functionsApplied || null);
          innerDict[eachKey] = urlArray;
        }
      }

      if (this._messageTemplate[ind]) {
        this._messageTemplate[ind][key] = innerDict;
      } else {
        this._messageTemplate[ind] = {};
        this._messageTemplate[ind][key] = innerDict;
      }

      // Check if array has values.
      const merged = _mergeArr(this._messageTemplate[ind][key]);
      if (merged.length > 0) {
        scrapeResults[key] = merged;
      }
    }

    for (const rule of Object.keys(payloadRules || {})) {
      this._createPayload(scrapeResults, ind, rule, ruleset);
    }
  }

  _getAttribute(cd, parentItem, item, attrib, keyName, functionsApplied) {
    const arr = [];
    const rootElement = Array.prototype.slice.call(cd.querySelectorAll(parentItem));
    for (let i = 0; i < rootElement.length; i += 1) {
      const val = rootElement[i].querySelector(item);
      if (val) {
        // Check if the value needs to be refined or not.
        let attribVal = val[attrib] || val.getAttribute(attrib);
        if (functionsApplied) {
          attribVal = functionsApplied.reduce((accum, e) => {
            if (Object.prototype.hasOwnProperty.call(this.refineFuncMappings, e[0])) {
              return this.refineFuncMappings[e[0]](accum, e[1], e[2]);
            }
            return accum;
          }, attribVal);
        }
        arr.push(attribVal);
      } else {
        arr.push(val);
      }
    }
    return arr;
  }

  _createPayload(scrapeResults, idx, key, ruleset) {
    let payloadRules;
    try {
      const patterns = this.patterns[ruleset];
      payloadRules = patterns.payloads[idx][key];

      if (payloadRules.type === 'single' && payloadRules.results === 'single') {
        scrapeResults[key].forEach((e) => {
          e.ctry = this._CliqzHumanWeb.getCountryCode();
          this._sendMessage(payloadRules, e);
        });
      } else if (payloadRules.type === 'single' && payloadRules.results === 'custom') {
        const payload = {};
        payloadRules.fields.forEach((e) => {
          try {
            payload[e[1]] = scrapeResults[e[0]][0][e[1]];
          } catch (ee) {
            // TODO: When does this happen? Is it a problem?
          }
          this._sendMessage(payloadRules, payload);
        });
      } else if (payloadRules.type === 'query' && payloadRules.results === 'clustered') {
        const payload = {};
        payloadRules.fields.forEach((e) => {
          if (e.length > 2) {
            // Note: will throw if scrapeResults[e[0]] is undefined.
            // Happens in production, too. Not an actual bug, as exceptions
            // are ignored.
            // TODO: Avoid these type of exceptions by some if-guards,
            // otherwise, the logged warning are misleading.
            const joinArr = {};
            for (let i = 0; i < scrapeResults[e[0]].length; i += 1) {
              joinArr[String(i)] = scrapeResults[e[0]][i];
            }
            payload[e[1]] = joinArr;
          } else {
            payload[e[1]] = scrapeResults[e[0]][0][e[1]];
          }
        });
        this._sendMessage(payloadRules, payload);
      } else if (payloadRules.type === 'query' && payloadRules.results === 'scattered') {
        const payload = {};
        payloadRules.fields.forEach((e) => {
          if (e.length > 2) {
            const joinArr = {};
            let counter = 0;
            e[0].forEach((eachPattern) => {
              for (let i = 0; i < scrapeResults[eachPattern].length; i += 1) {
                joinArr[String(counter)] = scrapeResults[eachPattern][i];
                counter += 1;
              }
            });
            if (Object.keys(joinArr).length > 0) {
              payload[e[1]] = joinArr;
            }
          } else {
            payload[e[1]] = scrapeResults[e[0]][0][e[1]];
          }
        });
        this._sendMessage(payloadRules, payload);
      }
    } catch (ee) {
      if (this._CliqzHumanWeb.debug) {
        logger.warn(
          '_createPayload failed (scrapeResults:', scrapeResults,
          ', key:', key, ', ruleset:', ruleset, ', payloadRules:',
          payloadRules, ', error:', ee, ')');
      } else {
        logger.warn(`_createPayload failed: ${ee}`);
      }
    }
  }

  _sendMessage(payloadRules, payload) {
    function allFieldsSet() {
      const allKeys = Object.keys(payload);
      for (const e of Object.keys(payloadRules.fields)) {
        if (allKeys.indexOf(payloadRules.fields[e][1]) === -1) {
          return false;
        }
        for (const eachField of allKeys) {
          if (!(payload[eachField])) {
            return false;
          }
        }
      }
      return true;
    }

    if (allFieldsSet()) {
      this._CliqzHumanWeb.telemetry({
        type: this.msgType,
        action: payloadRules.action,
        payload,
      });
    }
    this._messageTemplate = {};
  }
}
