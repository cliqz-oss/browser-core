/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { extractHostname } from '../core/tlds';
import { parse } from '../core/url';

import logger from './logger';
import { parseURL } from './network';

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

/**
 * Helper to implement the "json" function (part of the DSL used
 * in the patterns description).
 *
 * Takes a JSON string object, parses it and extract the data under the
 * given path. By default, it will only extract safe types (strings,
 * numbers, booleans), mostly to prevent accidentally extracting
 * more than intended.
 *
 * (exported for tests only)
 */
export function _jsonPath(json, path, extractObjects = false) {
  try {
    let obj = JSON.parse(json);
    for (const field of path.split('.')) {
      obj = obj[field];
    }
    if (typeof obj === 'string') {
      return obj;
    }
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj.toString();
    }
    if (extractObjects && obj) {
      return JSON.stringify(obj);
    }
    // prevent uncontrolled text extraction
    return '';
  } catch (e) {
    return '';
  }
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
 * Verifies that the given payload has all expected fields set.
 *
 * @param payload  the payload of the message to be checked
 * @param expectedFields  array with entries
 *   { key: name of the field; type: 'object'|'array' }.
 *
 * (exported for tests only)
 */
export function _allMandatoryFieldsSet(payload, expectedFields) {
  function isDefined(value) {
    return value !== null && value !== undefined && value !== '';
  }

  function isArrayLikeWithAtLeastOneTruthyEntry(arrayValue) {
    // Not an array according to JavaScript, but what we expect
    // is a JSON mapping like the following:
    //
    //   { "0": <entry0>, "1": <entry1>, ... }
    //
    // The message will be rejected only if there is no entry at all,
    // or if all its entries consists only of undefined mappings:
    //
    //  { "0": { "t": null,  "u": null } }  // false
    //  { "0": { "t": "",    "u": ""   } }  // false
    //  { "0": { "t": "foo", "u": ""   } }  // true (partial matches are OK)
    //
    return Object.values(arrayValue)
      .some(innerValue => Object.values(innerValue).some(isDefined));
  }

  for (const { key, type } of expectedFields) {
    const value = payload[key];
    if (!isDefined(value)) {
      return false;
    }

    // Perform additional checks for aggregated fields (e.g., result lists).
    if (type === 'array' && !isArrayLikeWithAtLeastOneTruthyEntry(value)) {
      return false;
    }
  }
  return true;
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
      json: _jsonPath,
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
      rArray: patternConfig.urlPatterns.map(x => new RegExp(x)),
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
        const baseURI = parse(url).origin;
        this._extractContent(i, pageContent, url, baseURI, ruleset);

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

    // Workaround for an encoding issue (source: https://stackoverflow.com/a/24417399/783510).
    // Reason: we want to preserve the original search term. In other words, searches
    // for "abc def" and "abc+def" should be distinguishable. That is why we need to
    // avoid the ambigious '+' character and use explicit white space encoding.
    //
    // (Note: backported from "human-web-lite"; for details, see tests in that module)
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
    return `https://${hostname}/${queryPrefix}${encodedQuery}`;
  }

  checkAnonSearchURL(url, query) {
    const index = this._checkSearchURL(url, 'strict');
    if (index === -1) {
      return { isSearchEngineUrl: false };
    }

    const hostname = extractHostname(url);
    const queryUrl = this._createAnonSearchQuery(hostname, query, index);

    if (extractHostname(queryUrl) !== hostname) {
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

  _extractContent(ind, cd, url, baseURI, ruleset) {
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
            rules[key][eachKey].functionsApplied || null,
            baseURI
          );
          innerDict[eachKey] = urlArray;
          if (ruleset === 'normal') {
            const query = urlArray[0];
            if (query) {
              logger.debug('Populating query Cache <<<< ', url, ' >>>> ', query);
              this._CliqzHumanWeb.addStrictQueries(url, query);
              this._CliqzHumanWeb.queryCache[url] = {
                d: 0,
                q: query,
                t: idMappings
              };
            }
          }
        } else {
          urlArray = this._getAttribute(
            cd, key,
            rules[key][eachKey].item,
            rules[key][eachKey].etype,
            rules[key][eachKey].keyName,
            rules[key][eachKey].functionsApplied || null,
            baseURI
          );
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
      this._processExtractedData(scrapeResults, ind, rule, ruleset);
    }
  }

  _getAttribute(cd, parentItem, item, attrib, keyName, functionsApplied, baseURI) {
    const arr = [];
    const rootElement = Array.prototype.slice.call(cd.querySelectorAll(parentItem));
    for (let i = 0; i < rootElement.length; i += 1) {
      const val = item ? rootElement[i].querySelector(item) : rootElement[i];
      if (val) {
        // Check if the value needs to be refined or not.
        let attribVal;
        if (attrib === 'href') {
          // Unless there is a <base> tag, DOMParser will use the extension id
          // as the implicit <base> for all relative links.
          try {
            const rawLink = val.getAttribute(attrib);
            attribVal = rawLink ? new URL(rawLink, baseURI).href : null;
          } catch (e) {
            attribVal = null;
          }
        } else {
          attribVal = val[attrib] || val.getAttribute(attrib);
        }
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

  /**
   * The structure of the final messages is defined in the "payloads"
   * section in "fields". Messages can have multiple fields.
   * Each field consists of two or three entries:
   *
   * <selector> <key> [<join>]
   *
   * The first (<selector>) is the key to the data that we just extracted.
   * The second (<key>) defines the name of the key in the final message
   * (in other words, what the server expects).
   *
   * The third is optional and defines how data should be aggregated.
   * Currently, the only aggregation rule is "join", which puts all
   * matches in one list. For example, "query" messages use it to
   * aggregate the list of results.
   *
   * When data for all keys is available, the message is ready to
   * be sent.
   *
   * To preserve anonymity, there are two additional steps,
   * which are out of scope of this function:
   *
   * - To prevent leaking sensitive information, the message
   *   will have to pass the human web sanitizer heuristics
   *   (i.e., parts of the message could be omitted or the
   *    message could be dropped completely.)
   * - For network anonymity, sending is done through HPN.
   */
  _processExtractedData(scrapeResults, idx, key, ruleset) {
    let payloadRules;
    try {
      const patterns = this.patterns[ruleset];
      payloadRules = patterns.payloads[idx][key];

      if (payloadRules.type === 'single' && payloadRules.results === 'single') {
        scrapeResults[key].forEach((e) => {
          e.ctry = this._CliqzHumanWeb.getCountryCode();
          this._sendMessageIfAllFieldsAreSet(payloadRules, e);
        });
      } else if (payloadRules.type === 'single' && payloadRules.results === 'custom') {
        // Note: currently, only used the "maliciousUrl" action.
        const payload = {};
        payloadRules.fields.forEach((e) => {
          try {
            payload[e[1]] = scrapeResults[e[0]][0][e[1]];
          } catch (ee) {
            // TODO: When does this happen? Is it a problem?
          }
          this._sendMessageIfAllFieldsAreSet(payloadRules, payload);
        });
      } else if (payloadRules.type === 'query' && payloadRules.results === 'clustered') {
        const payload = {};
        payloadRules.fields.forEach((e) => {
          const extractedContent = scrapeResults[e[0]];
          if (extractedContent !== undefined) {
            if (e.length > 2) {
              if (e[2] === 'join') {
                // Aggregate all results into one array-like map
                // ({ "0" => <entry0>, "1": <entry1>, ... }).
                //
                // Skip entries where all values are empty, but keep
                // entries when there is at least one value, for instance,
                // '{ "t": "foo", "u": null }' would still be added:
                //
                // * Filtering values without any match is useful because
                //   it allows to throw away false positives (i.e., when a
                //   css selector matched unrelated parts).
                //
                // * Partial matches, on the other hand, should not be dropped.
                //   In general, they are not false positives, but rules that
                //   used to work before but are now partly broken because of
                //   recent layout changes. In that case, it is still better
                //   to send the message with the partial results then dropping
                //   it completely.
                //
                const joinArr = {};
                let counter = 0;
                for (let i = 0; i < extractedContent.length; i += 1) {
                  if (Object.values(extractedContent[i]).some(x => x)) {
                    joinArr[String(counter)] = extractedContent[i];
                    counter += 1;
                  }
                }
                payload[e[1]] = joinArr;
              } else {
                // Currently unreachable by the published patterns.
                logger.warn('Ignoring rule with unexpected aggregator:', e);
              }
            } else {
              payload[e[1]] = extractedContent[0][e[1]];
            }
          }
        });
        this._sendMessageIfAllFieldsAreSet(payloadRules, payload);
      } else if (payloadRules.type === 'query' && payloadRules.results === 'scattered') {
        // Note: currently not used (TODO: remove or leave?)
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
        this._sendMessageIfAllFieldsAreSet(payloadRules, payload);
      }
    } catch (ee) {
      if (this._CliqzHumanWeb.debug) {
        logger.warn(
          '_processExtractedData failed (scrapeResults:', scrapeResults,
          ', key:', key, ', ruleset:', ruleset, ', payloadRules:',
          payloadRules, ', error:', ee, ')'
        );
      } else {
        logger.warn(`_processExtractedData failed: ${ee}`);
      }
    }
  }

  _sendMessageIfAllFieldsAreSet(payloadRules, payload) {
    const expectedFields = payloadRules.fields.map(([, key, aggregator]) => {
      // Note: currently, 'join' is the only aggregator and thus
      // it is the only possibility to have arrays in the output.
      const type = aggregator === 'join' ? 'array' : 'object';
      return { key, type };
    });

    if (_allMandatoryFieldsSet(payload, expectedFields)) {
      this._CliqzHumanWeb.telemetry({
        type: this.msgType,
        action: payloadRules.action,
        payload,
      });
    }
    this._messageTemplate = {};
  }

  tryExtractCliqzSerpQuery(url) {
    const isCliqzSearch = url.startsWith('https://cliqz.com/search?')
          || url.startsWith('https://beta.cliqz.com/search?');
    return isCliqzSearch && parse(url).searchParams.get('q');
  }
}
