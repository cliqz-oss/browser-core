/* eslint no-param-reassign: ["error", { "props": false }] */
import logger from './common/offers_v2_logger';

/**
 * This class / module will be used to fast evaluate and check if a regex matches
 * a particular string (mainly url).
 */

const CACHE_EXPIRE_TIME_SECS = 60 * 60;
const MAX_URL_LENGTH = 300;

class SpecialTrie {
  constructor() {
    this.trie = { cs: {}, w: false };
  }

  addWord(w) {
    if (!w || w.length === 0) {
      return;
    }
    let lastChild = this.trie;
    for (let i = 0; i < w.length; i += 1) {
      lastChild = this._getOrCreateChildren(lastChild, w[i]);
    }
    lastChild.w = true;
  }

  findAny(sText) {
    // we assume that the structured text is a structure containing the following
    // information:
    // {
    //    raw: 'the raw text we are searching  in',
    //    map: {
    //      char_i: [pos1, pos2,...],
    //      char_x: [posX1, posX2..],
    //    }
    // }
    // we return true if we find a word false otherwise
    //
    function checkWord(w) {
      if (!sText || !w || w.length === 0) {
        return false;
      }
      const indices = sText.map[w[0]];
      if (!indices) {
        return false;
      }
      // else we need to iterate to see if we find the exact word on those positions
      for (let i = 0; i < indices.length; i += 1) {
        if (sText.raw.indexOf(w, indices[i]) >= 0) {
          return true;
        }
      }
      return false;
    }

    function findInNode(n, suffix) {
      const children = n.cs;
      let found = false;
      Object.keys(children).forEach((char) => {
        if (found) {
          return;
        }
        const currWord = suffix + char;
        const destNode = children[char];
        if (destNode.w) {
          // in suffix we have the current world, we need to check and return;
          const isPresent = checkWord(currWord);
          if (isPresent) {
            found = true;
            return;
          }
        }
        // else we need to check the children
        found = found || findInNode(destNode, currWord);
      });
      return found;
    }
    return findInNode(this.trie, '');
  }

  _getOrCreateChildren(aP, c) {
    const p = aP;
    let child = p.cs[c];
    if (child) {
      return child;
    }
    child = p.cs[c] = { cs: {}, w: false };
    return child;
  }
}


export default class RegexpHelper {

  constructor() {
    this.cachedRegObjs = {};
  }

  /**
   * Will build a data that should be used later when checking the regex objects
   * so we can perform a faster check.
   * Since the same url will be checked against multiple "regex bundles" then makes
   * sense to build it only once
   * @param  {[type]} urlData [description]
   * @return {[type]}         [description]
   */
  buildUrlMatchData(urlData) {
    if (!urlData || !urlData.domain || !urlData.url) {
      logger.warn(`buildUrlMatchData: invalid url data argument: ${JSON.stringify(urlData)}`);
      return {};
    }

    return {
      raw_url: urlData.url,
      domain: urlData.domain,
    };
  }

  /**
   * this will create (compile) a new regex object, this object will be used later
   * when we need to evaluate a urlMatchData object against the RegexObject (bundle).
   * The argument is the data defined on the BE as:
   * @param  {[type]} regexData The regex raw information (coming from the BE)
   *                            Note that all the fields are necesary (can be empty)
   * <pre>
   * [
   *   {
   *      // this is the list of domains (could be one or multiple)
   *      d: [d1, d2, d3,...],
   *      // this are the list of "string patterns" we will try to match, 0 or more
   *      p: [p1, p2, p3,...],
   *      // this will be the regex to be checked at the end, 0 or more
   *      r: [r1, r2, r3,...]
   *   },
   *
   * ]
   * </pre>
   * @return {[type]}           [description]
   */
  compileRegexObject(regexData) {
    if (!regexData || regexData.length === 0) {
      logger.warn('compileRegexObject: empty regexData?');
      return {};
    }
    function compileAndAddRegexMap(aRegMap, regList, regStr) {
      const regMap = aRegMap;
      const buildRegIdx = regMap[regStr];
      if (!buildRegIdx) {
        let regExpObj = null;
        try {
          regExpObj = new RegExp(regStr);
        } catch (e) {
          logger.error(`compileAndAddRegexMap: error building regex for ${regStr}`);
        }
        if (!regExpObj) {
          return -1;
        }
        // we need to build it and add it
        const index = regList.length;
        regMap[regStr] = index;
        regList.push(regExpObj);
        return index;
      }
      return regMap[regStr];
    }

    const regMap = {};
    const regList = [];
    const result = {};
    regexData.forEach((aRegex) => {
      const regex = aRegex;
      // adding missing fields if not found
      if (!regex || !regex.d) {
        // skip this one
        return;
      }
      if (!regex.p) {
        regex.p = [];
      }
      if (!regex.r) {
        regex.r = [];
      }
      // build the list of regex indices
      const regexIndices = [];
      regex.r.forEach((rStr) => {
        const idx = compileAndAddRegexMap(regMap, regList, rStr);
        if (idx >= 0) {
          regexIndices.push(idx);
        }
      });
      // now for each domain we have we will add the list of patterns and regex
      // WE MUST HAVE DOMAIN
      regex.d.forEach((dom) => {
        let domMap = result[dom];
        if (!domMap) {
          domMap = result[dom] = {};
        }
        // if there are no strPattern then we use the '' for the dom to create
        // the set
        if (regex.p.length === 0) {
          domMap[''] = new Set(regexIndices);
        } else {
          regex.p.forEach((strPattern) => {
            let pMap = domMap[strPattern];
            if (!pMap) {
              pMap = domMap[strPattern] = new Set(regexIndices);
            } else {
              pMap = new Set([...pMap, ...regexIndices]);
            }
          });
        }
      });
    });

    // here now for each domain we have a list of patterns, we merge all
    // of them into a trie and merge all the regex indices
    const builtMap = {};
    Object.keys(result).forEach((domName) => {
      const domMap = builtMap[domName] = {};
      const curMap = result[domName];
      const patternsList = Object.keys(curMap);
      if (patternsList.length === 1 && patternsList[0] === '') {
        // is the special case that we don't have patterns
        domMap.trie = null;
        domMap.reg_idx = curMap[''];
      } else {
        const trie = new SpecialTrie();
        let regIndices = new Set();
        patternsList.forEach((strPattern) => {
          trie.addWord(strPattern);
          regIndices = new Set([...curMap[strPattern], ...regIndices]);
        });
        domMap.trie = trie;
        domMap.reg_idx = regIndices;
      }
    });

    return {
      dom_map: builtMap,
      compiled_regex: regList
    };
  }

  /**
   * will return the cached object if we have one or null || undefined if not
   * @param  {[type]} obID [description]
   * @return {[type]}      [description]
   */
  getCachedRegexObject(objID) {
    if (!objID) {
      return null;
    }
    const container = this.cachedRegObjs[objID];
    if (!container) {
      return null;
    }
    // check expire date
    const diff = (Date.now() - container.created) / 1000;
    if (diff > CACHE_EXPIRE_TIME_SECS) {
      // remove this
      delete this.cachedRegObjs[objID];
      return null;
    }
    return container.obj;
  }
  cacheRegexObject(objID, obj) {
    if (!objID) {
      return;
    }
    this.cachedRegObjs[objID] = {
      obj,
      created: Date.now()
    };
  }

  /**
   * this method will check if the given urldata matches with the given compiled
   * regex object.
   * Will return true if it does | false otherwise
   * @param  {[type]} urlMatchData     [description]
   * @param  {[type]} compiledRegexObj [description]
   * @return {[type]}                  [description]
   */
  testRegex(urlMatchData, compiledRegexObj) {
    // check they have the proper format
    if (!urlMatchData ||
        !urlMatchData.domain ||
        !urlMatchData.raw_url ||
        !compiledRegexObj ||
        !compiledRegexObj.dom_map ||
        !compiledRegexObj.compiled_regex) {
      logger.warn('testRegex: invalid arguments');
      return false;
    }

    // check domain first
    const domMap = compiledRegexObj.dom_map[urlMatchData.domain];
    if (!domMap) {
      return false;
    }
    // check for the given domain if we need to check patterns or not
    let regexIndices = new Set();
    let strPatternMatch = false;
    if (!domMap.trie) {
      // we don't have a trie so we just need to check the regex directly
      regexIndices = domMap.reg_idx;
      // we mark as matched the key pattern
      strPatternMatch = true;
    } else {
      // check if we match any of the patterns
      // EX-5003: here we will need the idx map so we will build it, lazy mode
      if (!urlMatchData.idx_map) {
        urlMatchData.idx_map = this._buildUrlIdxMap(urlMatchData);
      }
      const sText = {
        map: urlMatchData.idx_map,
        raw: urlMatchData.raw_url
      };
      if (domMap.trie.findAny(sText)) {
        regexIndices = domMap.reg_idx;
        strPatternMatch = true;
      }
    }

    // now we need to check if if any of the regexes works
    let matched = strPatternMatch && regexIndices.size === 0;
    regexIndices.forEach((rindex) => {
      if (!matched) {
        // test this regex
        if (compiledRegexObj.compiled_regex[rindex].test(urlMatchData.raw_url)) {
          matched = true;
        }
      }
    });
    return matched;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                              PRIVATE
  // ///////////////////////////////////////////////////////////////////////////

  _buildUrlIdxMap(urlMatchData) {
    if (urlMatchData.idx_map) {
      // already built?
      return urlMatchData.idx_map;
    }
    // maybe we want to hash it as well or pre-process it
    const indexMap = {};

    // we will not check all the url only the first N characters.
    const numChars = Math.min(urlMatchData.raw_url.length, MAX_URL_LENGTH);

    for (let i = 0; i < numChars; i += 1) {
      const ch = urlMatchData.raw_url[i];
      let il = indexMap[ch];
      if (!il) {
        il = indexMap[ch] = [];
      }
      il.push(i);
    }
    return indexMap;
  }
}
