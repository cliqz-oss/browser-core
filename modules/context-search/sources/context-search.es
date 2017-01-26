import { utils } from 'core/cliqz';
import { queryActiveTabs } from 'core/tabs';
import * as urlHelpers from 'core/url';
import { forEachWindow } from 'platform/browser';
import CliqzHumanWeb from 'human-web/human-web';

// TODO:
// what to do with private pages and words

class ContextSearch {
  constructor() {
    this.name = 'contextsearch';
    this.LOG_KEY = 'contextsearch';
    this.window = 3;
    this.docCache = Object.create(null);
    this.wordMap = Object.create(null);
    this.checkOldEntriesId = null;
    this.sendMessageIntervalId = null;
    this.dropOldHashesId = null;
    this.checkClosedTabsId = null;
    this.messages = [];

    this.distribution = Object.create(null);
    this.invalidCache = false;
    this.sentUrls = new Set();
    this.savedQuery = '';
    this.totalCounters = { A: 0, B: 0, C: 0, D: 0 };
    this.totalCountersFirst = { A: 0, B: 0, C: 0, D: 0 };

    this.sendMessageInterval = 4 * 60 * 1000; // default 4 min
    this.checkClosedTabs = 5 * 60 * 1000; // default 5 min
    this.checkOldEntries = 30 * 60 * 1000; // default 30 min
    this.oldEntriesTTL = 60 * 60 * 1000; // default 60 min
    this.dropOldHashes = 2 * 60 * 60 * 1000;// default 2 hours

    // debug versions
    // this.checkClosedTabs = 30 * 1000; //  30 sec
    // this.checkOldEntries = 4 * 60 * 1000; //  4 min
    // this.oldEntriesTTL = 1*60*1000; //  1 min
    // this.dropOldHashes = 2 * 60 * 1000; // 2 min
  }

  init() {
    if (this.checkClosedTabsId == null) {
      this.checkClosedTabsId = utils.setInterval(this.removeClosedTabs.bind(this),
        this.checkClosedTabs);
    }
    if (this.checkOldEntriesId == null) {
      this.checkOldEntriesId = utils.setInterval(this.removeOldEntries.bind(this),
        this.checkOldEntries);
    }
    if (this.dropOldHashesId == null) {
      this.dropOldHashesId = utils.setInterval(this.dropDeletedHashes.bind(this),
        this.dropOldHashes);
    }
    if (this.sendMessageIntervalId == null) {
      this.sendMessageIntervalId = utils.setInterval(this.sendMessage.bind(this),
        this.sendMessageInterval);
    }
  }

  unload() {
    if (this.checkClosedTabsId !== null) {
      utils.clearInterval(this.checkClosedTabsId);
      this.checkClosedTabsId = null;
    }
    if (this.checkOldEntriesId !== null) {
      utils.clearInterval(this.checkOldEntriesId);
      this.checkOldEntriesId = null;
    }
    if (this.dropOldHashesId !== null) {
      utils.clearInterval(this.dropOldHashesId);
      this.dropOldHashesId = null;
    }
    if (this.sendMessageIntervalId !== null) {
      if (this.messages.length !== 0) {
        this.sendMessage();
      }
      utils.clearInterval(this.sendMessageIntervalId);
      this.sendMessageIntervalId = null;
    }
  }

  getAllOpenUrls() {
    const urls = [];
    try {
      forEachWindow(win => {
        const openTabs = queryActiveTabs(win);
        openTabs.forEach(data => {
          const url = ContextSearch.cleanCurrentUrl(data.url);
          if (url && urls.indexOf(url) === -1) {
            urls.push(url);
          }
        });
      });
    } catch (ee) {
      // do nothing, return empty set
    }
    return urls;
  }

  invalidateDistribution() {
    this.distribution = Object.create(null);
    this.sentUrls = new Set();
    this.invalidCache = false;
  }

  addWordsToCache(cacheId, words, type) {
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.length > 3 && word.length < 30 && /^\d+$/.test(word) === false) {
        const minI = Math.max(i - this.window, 0);
        const maxI = Math.min(i + this.window + 1, words.length);
        const windowStr = words.slice(minI, maxI).join();
        // TODO: add stemming, tokenisation
        if (!(word in this.wordMap)) {
          this.wordMap[word] = {};
        }
        if (!(cacheId in this.wordMap[word])) {
          this.wordMap[word][cacheId] = [];
        }
        this.wordMap[word][cacheId].push({
          window: windowStr,
          type,
        });
      }
    }
  }

  addPageToCache(pageStruct) {
    const url = pageStruct.url;
    if (url) {
      const doc = Object.create(null);
      doc.url = url;
      doc.body = pageStruct.body;
      doc.title = pageStruct.title;
      doc.timestamp = Date.now();
      doc.tab = true;
      this.docCache[url] = doc;

      let words = ContextSearch.getBOW(url, 'u');
      this.addWordsToCache(url, words, 'u');
      if (pageStruct.title) {
        words = ContextSearch.getBOW(pageStruct.title, 't');
        this.addWordsToCache(url, words, 't');
      }
      if (pageStruct.body) {
        words = ContextSearch.getBOW(pageStruct.body, 'b');
        this.addWordsToCache(url, words, 'b');
      }
    }
  }

  static getBOW(inputString, type) {
    let words = [];
    if (inputString) {
      if (type === 'u') {
        words = urlHelpers.urlStripProtocol(inputString).toLowerCase().split(/[/\.\-_]+/);
      }
      if (type === 't' || type === 'b') {
        words = inputString.trim().toLowerCase().split(/[^\w\u00C0-\u024f]+/);
      }
    }
    return words;
  }

  removeClosedTabs() {
    // update tab value from tabs
    const openUrls = this.getAllOpenUrls();
    Object.keys(this.docCache).forEach(urlId => {
      if (openUrls.indexOf(urlId) === -1 && this.docCache[urlId].tab) {
        this.docCache[urlId].tab = false;
      }
    });
  }

  removeOldEntries() {
    const currentTime = Date.now();
    Object.keys(this.docCache).forEach(urlId => {
      const elem = this.docCache[urlId];
      if (elem.tab === false && currentTime > (elem.timestamp + this.oldEntriesTTL)) {
        delete this.docCache[urlId];
      }
    });
  }

  dropDeletedHashes() {
    // do this rarely
    Object.keys(this.wordMap).forEach(word => {
      const elem = this.wordMap[word];
      Object.keys(elem).forEach(urlId => {
        if (!this.docCache[urlId]) {
          // delete url
          delete this.wordMap[word][urlId];
        }
      });
      if (Object.keys(this.wordMap[word]).length === 0) {
        delete this.wordMap[word];
      }
    });
  }

  sendMessage() {
    // create total numbers message
    let s = 0;
    Object.keys(this.totalCounters).forEach(ch => {
      s += this.totalCounters[ch];
    });
    if (s > 0) {
      // we have something to send
      const message = {
        type: 'humanweb',
        action: 'usercontext',
        payload: {
          result: 'total',
          distribution: this.totalCounters,
        },
      };
      this.messages.push(message);
    }
    s = 0;
    Object.keys(this.totalCountersFirst).forEach(ch => {
      s += this.totalCountersFirst[ch];
    });
    if (s > 0) {
      // we have something to send
      const message = {
        type: 'humanweb',
        action: 'usercontext',
        payload: {
          result: 'total_first',
          distribution: this.totalCountersFirst,
        },
      };
      this.messages.push(message);
    }

    this.messages.forEach(CliqzHumanWeb.telemetry);

    // reset
    this.messages = [];
    this.totalCounters = { A: 0, B: 0, C: 0, D: 0 };
    this.totalCountersFirst = { A: 0, B: 0, C: 0, D: 0 };
  }

  validUrl(url) {
    let valid = true;
    if (!url) {
      valid = false;
    } else if (CliqzHumanWeb.checkSearchURL(url) !== -1) {
      valid = false;
    } else if (ContextSearch.isNotUrl(url)) {
      valid = false;
    } else {
      const openUrls = this.getAllOpenUrls();
      if (openUrls.indexOf(url) === -1) {
        valid = false;
      }
    }
    return valid;
  }

  static cleanCurrentUrl(url) {
    let modUrl = url;
    try {
      modUrl = decodeURIComponent(url.trim());
    } catch (ee) {
      // do nothing
    }

    if (modUrl) {
      return modUrl;
    }
    return null;
  }


  /**
   * check if string is real url (starts with http)
   * or it's system url (`about:config`, etc )
   * @param str - input string
   * @returns {boolean} - true if it's system url, false - otherwise
   */
  static isNotUrl(str) {
    const trimmed = str.trim().toLowerCase();
    return (
      trimmed.startsWith('about:') ||
      trimmed.startsWith('view-source:') ||
      trimmed.startsWith('file:') ||
      trimmed.startsWith('chrome:')
    );
  }

  /**
   * check if string looks like url and can be opened by browser
   * @param str input string
   * @returns {boolean} true if it's url
   */
  static isUrl(str) {
    const trimmed = str.trim().toLowerCase();
    return (trimmed.startsWith('http') ||
      trimmed.startsWith('about:') ||
      trimmed.startsWith('view-source:') ||
      trimmed.startsWith('file:') ||
      trimmed.startsWith('chrome:')
    );
  }

  // not used in current version
  prepareMessage(query) {
    // check if query is url
    if (ContextSearch.isUrl(query)) {
      return;
    }
    const words = query.trim().toLowerCase().split(/[\W]+/);
    if (words.length > 3) {
      const message = {
        type: 'humanweb',
        action: 'usercontext',
        payload: {
          result: 'too long query',
          query,
        },
      };
      this.messages.push(message);
    } else {
      const urls = Object.create(null);
      const mainWord = words[0];
      Object.keys(this.wordMap[mainWord] || {}).forEach(urlId => {
        if (urlId in this.docCache) {
          const now = Date.now();
          const wordInfo = this.wordMap[mainWord][urlId];
          const doc = this.docCache[urlId];
          for (const wordInfoElement of wordInfo) {
            const text = wordInfoElement.window;

            const present = words.every(word => text.indexOf(word) !== -1);

            if (present) {
              const payload = {
                type: wordInfoElement.type,
                text: wordInfoElement.window,
                timestamp: (now - doc.timestamp) / 1000, // seconds
                url: doc.url,
                location: (doc.tab ? 'tab' : 'history'),
              };
              if (!(urls[doc.url]) || payload.type > urls[doc.url].type) {
                urls[doc.url] = payload;
              }
            }
          }
        }
      });

      if (Object.keys(urls).length > 0) {
        Object.keys(urls).forEach(urlId => {
          const message = {
            type: 'humanweb',
            action: 'usercontext',
            payload: {
              result: 'found',
              query,
            },
          };
          Object.keys(urls[urlId]).forEach(k => {
            message.payload[k] = urls[urlId][k];
          });

          this.messages.push(message);
        });
      } else {
        const message = {
          type: 'humanweb',
          action: 'usercontext',
          payload: {
            result: 'not found',
            query,
          },
        };
        this.messages.push(message);
      }
    }
  }

  addNewUrlToCache(url, params) {
    const activeURL = ContextSearch.cleanCurrentUrl(url);
    if (this.validUrl(activeURL)) {
      if (!(this.docCache[activeURL])) {
        let title = '';
        let description = '';
        const res = Object.create(null);
        if (params.title) {
          title = params.title;
        }
        if (params.ogTitle && title !== params.ogTitle) {
          title = `${title} ${params.title}`;
        }
        if (params.description) {
          description = params.description;
        }
        if (params.ogDescription && description !== params.ogDescription) {
          description = `${description} ${params.ogDescription}`;
        }

        if (title) {
          res.title = title;
        }
        if (description) {
          res.body = description;
        }
        if (Object.keys(res).length > 0) {
          res.url = activeURL;
          this.addPageToCache(res);
        }
      } else {
        // update timestamp and tab
        this.docCache[activeURL].tab = true;
        this.docCache[activeURL].timestamp = Date.now();
      }
    }
  }

  testUrlDistribution(url) {
    const activeURL = ContextSearch.cleanCurrentUrl(url);
    if (this.validUrl(activeURL) &&
        Object.keys(this.distribution).length > 0 &&
        !(this.sentUrls.has(activeURL))) {
      const strippedUrl = urlHelpers.urlStripProtocol(url);
      this.sentUrls.add(activeURL);

      // check if we have url in our distribution
      if (strippedUrl in this.distribution) {
        const result = Object.create(null);

        // if yes - found out on which position it has appears
        // saved first unique position and total found count
        let first = true;
        Object.keys(this.distribution[strippedUrl]).sort().forEach(charNum => {
          this.distribution[strippedUrl][charNum].forEach(val => {
            if (!(val in result)) {
              result[val] = charNum;
            }
            // update total counters each time as well
            this.totalCounters[val] += 1;
            if (first) {
              this.totalCountersFirst[val] += 1;
            }
          });
          first = false;
        });
        const message = {
          type: 'humanweb',
          action: 'usercontext',
          payload: {
            url,
            result: 'distribution',
            distribution: result,
          },
        };
        this.messages.push(message);
      } else {
        const message = {
          type: 'humanweb',
          action: 'usercontext',
          payload: {
            result: 'not found',
            url,
          },
        };
        this.messages.push(message);
      }
    }
  }

  /**
   * calculate how many times we saw words from given page in our cache
   * @param response
   * @returns {*} response with added `rerank_length` value to each result
   */

  calculateBOWLength(response) {
    const bowResponse = response;
    bowResponse.forEach(r => {
      let words = ContextSearch.getBOW(r.url, 'u');
      if (r.snippet) {
        words = words.concat(
          ContextSearch.getBOW(r.snippet.title, 't'),
          ContextSearch.getBOW(r.snippet.description, 'b')
        );
      }
      // eslint-disable-next-line no-param-reassign
      r.rerank_length = Array.from(new Set(words)).filter(value => (value in this.wordMap)).length;
    });
    return bowResponse;
  }

  /**
   * rerank array based on score and new field rerank_length
   * @param response
   * @returns {{newResponse: Array, count: number}}
   */
  static rerankResponse(response) {
    const bufResponse = response;
    const threshold = 2.00;
    const newResponse = [];
    let count = 0;
    for (let i = 0; i < bufResponse.length - 1; i++) {
      if (bufResponse[i].rerank_length < bufResponse[i + 1].rerank_length &&
        bufResponse[i].score < bufResponse[i + 1].score * threshold) {
        newResponse.push(bufResponse[i + 1]);
        bufResponse[i + 1] = response[i];
        count += 1;
      } else {
        newResponse.push(bufResponse[i]);
      }
    }
    newResponse.push(bufResponse[bufResponse.length - 1]);
    return {
      newResponse,
      count,
    };
  }

  /**
   * merge 2 arrays using original result score in asc order
   * @param res1
   * @param res2
   * @returns {Array}
   */

  static mergeResults(res1, res2) {
    const result = [];
    let p1 = 0;
    let p2 = 0;
    const urls = new Set();
    while (true) {
      if (p1 === res1.length) {
        for (let i = p2; i < res2.length; i++) {
          if (!urls.has(res2[i].url)) {
            urls.add(res2[i].url);
            result.push(res2[i]);
          }
        }
        break;
      }
      if (p2 === res2.length) {
        for (let i = p1; i < res1.length; i++) {
          if (!urls.has(res1[i].url)) {
            urls.add(res1[i].url);
            result.push(res1[i]);
          }
        }
        break;
      }
      if (res1[p1].score > res2[p2].score) {
        if (!urls.has(res1[p1].url)) {
          urls.add(res1[p1].url);
          result.push(res1[p1]);
        }
        p1 += 1;
      } else {
        if (!urls.has(res2[p2].url)) {
          urls.add(res2[p2].url);
          result.push(res2[p2]);
        }
        p2 += 1;
      }
    }
    return result;
  }

  /**
   * get expanded (extended) version of query based on latest history
   * @param q
   * @returns {*}
   */

  getQExt(q) {
    const words = ContextSearch.getBOW(q, 't');
    const mapping = [];
    const urlMapping = {};
    words.forEach(word => {
      Object.keys(this.wordMap).forEach(key => {
        if (key.startsWith(word)) {
          let s = 0;
          Object.keys(this.wordMap[key]).forEach(url => {
            s += this.wordMap[key][url].length;
            if (!(url in urlMapping)) {
              urlMapping[url] = [];
            }
            if (!(key in urlMapping[url])) {
              urlMapping[url].push(key);
            }
          });
          mapping.push({
            key,
            nUrls: Object.keys(this.wordMap[key]).length,
            nEntries: s,
            sum: s + Object.keys(this.wordMap[key]).length,
          });
        }
      });
    });

    let result = null;
    // seen at least MIN_SEEN times among different urls
    // or differnet parts of the same url
    const MIN_SEEN = 5;
    if (words.length > 1) {
      // if original query had more than 1 word - trying to mix them here as well
      for (const url of Object.keys(urlMapping)) {
        if (urlMapping[url].length >= words.length) {
          result = urlMapping[url].join(' ');
          break;
        }
      }
    } else if (mapping.length > 0) {
      // else find the best from all candidates
      const bestValue = mapping.sort((a, b) => (b.sum - a.sum))[0];
      if (bestValue && bestValue.sum > MIN_SEEN) {
        result = bestValue.key;
      }
    }
    return result;
  }

  /**
   * do nothing, just return default response
   * variant A
   * @param response
   * @returns {{telemetrySignal: {context_search: boolean, version: number}, response: *}}
   */
  doRerank1(response) {
    const telemetrySignal = { context_search: false, version: 1 };
    return {
      telemetrySignal,
      response,
    };
  }

  /**
   * rerank original result based on words in cache
   * variant B
   * @param response
   * @returns {{telemetrySignal: {context_search: boolean}, response: Array}}
   */
  doRerank2(response) {
    const telemetrySignal = { context_search: false };

    const bowResponse = this.calculateBOWLength(response);
    const newValue = ContextSearch.rerankResponse(bowResponse);
    const newResponse = newValue.newResponse;
    const count = newValue.count;

    if (count > 0) {
      telemetrySignal.context_search = true;
      telemetrySignal.version = 2;
      telemetrySignal.reranked_count = count;
    }

    return {
      telemetrySignal,
      response: newResponse,
    };
  }

  /**
   * merge original and expanded results
   * variant C
   * @param response
   * @returns {{telemetrySignal: {context_search: boolean}, response: Array}}
   */

  doRerank3(response) {
    const telemetrySignal = { context_search: false };
    let mergedResponse = [];
    let count = 0;
    if (response.length === 1) {
      mergedResponse = response[0];
    } else {
      mergedResponse = ContextSearch.mergeResults(response[0], response[1]);
      count = mergedResponse.filter((v, i) => (i < Math.min(10, response[0].length - 1) &&
                                               v !== response[0][i])).length;
      // }).length;
      telemetrySignal.context_search = true;
    }

    telemetrySignal.version = 3;
    telemetrySignal.reranked_count = count;

    return {
      telemetrySignal,
      response: mergedResponse,
    };
  }

  /**
   * merge original and expanded results and rerank them afterwards
   * variant D
   * @param response
   * @returns {{telemetrySignal: {context_search: boolean}, response: Array}}
   */
  doRerank4(response) {
    const telemetrySignal = { context_search: false };
    let mergedResponse = [];
    let count = 0;
    if (response.length === 1) {
      mergedResponse = response[0];
    } else {
      mergedResponse = ContextSearch.mergeResults(response[0], response[1]);
      const bowResponse = this.calculateBOWLength(mergedResponse);
      const newValue = ContextSearch.rerankResponse(bowResponse);
      mergedResponse = newValue.newResponse;
      count = newValue.count;
    }

    if (count > 0) {
      telemetrySignal.context_search = true;
      telemetrySignal.version = 4;
      telemetrySignal.reranked_count = count;
    }

    return {
      telemetrySignal,
      response: mergedResponse,
    };
  }

  // printResult(response){
  //   response.forEach(r => {
  //     utils.log(r.q, r.url);
  //   });
  // }

  /**
   * update distribution cache with results from each response
   * @param results
   * @param type - type {A, B, C, D}
   * @param len - query length
   */
  updateDistribution(results, type, len) {
    results.forEach(res => {
      const strippedUrl = urlHelpers.urlStripProtocol(res.url);
      if (!(strippedUrl in this.distribution)) {
        this.distribution[strippedUrl] = {};
        this.distribution[strippedUrl][len] = new Set();
      }
      if (!(len in this.distribution[strippedUrl])) {
        this.distribution[strippedUrl][len] = new Set();
      }
      this.distribution[strippedUrl][len].add(type);
    });
  }

  /**
   * main function to call all possible rerankers (2 o 4)
   * @param response
   * @param query
   */
  doRerank(response, query) {
    utils.log(this.savedQuery, query);
    if (query === this.savedQuery) {
      // continue to search
      this.invalidCache = false;
    }
    if (this.invalidCache) {
      this.invalidateDistribution();
    }

    this.savedQuery = query;
    let doubledResponse = false;
    const contextResults = [response[0].response.results];

    if (response.length === 2) {
      doubledResponse = true;
      contextResults.push(response[1].response.results);
    }

    if (doubledResponse) {
      // type 3 and 4
      const resC = this.doRerank3(contextResults);
      this.updateDistribution(resC.response, 'C', query.length);
      const resD = this.doRerank4(contextResults);
      this.updateDistribution(resD.response, 'D', query.length);
    }

    const resA = this.doRerank1(contextResults[0]);
    this.updateDistribution(resA.response, 'A', query.length);
    const resB = this.doRerank2(contextResults[0]);
    this.updateDistribution(resB.response, 'B', query.length);
  }

}

export default ContextSearch;
