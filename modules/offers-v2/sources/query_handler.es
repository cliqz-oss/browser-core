// //////////////////////////////////////////////////////////////////////////////////
// This module is used to handle (extract and normalize) queries that are typed by
// the User in the following commercially valuable engines:
// * Google
// * Bing
// * Amazon
// * Yahoo
// //////////////////////////////////////////////////////////////////////////////////
import DBHelper from './db_helper';
import OffersConfigs from './offers_configs';
import { utils } from '../core/cliqz';
import { timestampMS } from './utils';
import logger from './common/offers_v2_logger';

const STORAGE_DB_DOC_ID = 'offers-queries';


export default class QueryHandler {

  constructor(offersDB) {
    if (offersDB) {
      this.db = new DBHelper(offersDB);
    } else {
      this.db = null;
    }

    // Posting list related to the query.
    this.queryPostings = {};

    // tsToPosting represents a mapping form ts to a posting.
    // Timestamp is effectively used as lookup index.
    this.tsToPostingMap = {};

    // listPostings DS is a list of objects containing postings in a structured way
    // Used for persising. At the time of writing list is always truncated to the last 20 elements
    this.listPostings = [];

    this.enginePatternMap = {
      amazon: /.*[?&#]field-keywords=([^&]*)/,
      bing: /.*[?&#]q=([^&]*)/,
      google: /.*[?&#]q=([^&]*)/,
      yahoo: /.*[?&#]p=([^&]*)/,
    };

    this.isDataDirty = false;
    this._loadPersistentData();

    // save signals in a frequent way
    const self = this;
    if (OffersConfigs.QUERY_POSTINGS_LOAD_FROM_DB) {
      this.saveInterval = utils.setInterval(() => {
        if (self.isDataDirty) {
          self._savePersistenceData();
        }
      },
      OffersConfigs.QUERY_HANDLER_AUTOSAVE_FREQ_SECS * 1000);
    }
  }

  destroy() {
    this._savePersistenceData();

    if (this.saveInterval) {
      utils.clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

// //////////////////////////////////////////////////////////////////////////////////
//                             Public Methods.
// //////////////////////////////////////////////////////////////////////////////////
  /**
   * Method takes a raw url and a top level domain and returns an object that contains
   * the search engine extracted from the domain name and the normalized form of the query
   * @param url
   * @param domain
   * @returns
   *  {
   *    engine [String]: Domain Name of the supported search engine. E.g amazon
   *    query [String]: very basic normalized form of query. Umlauts are retained
   *    ts [Long] : timeStamp when the qurey was processed
   *  }
   */
  normalize(url, domain) {
    if (!url || !url.length || !domain || !domain.length) {
      return null;
    }
    const domainName = domain.split('.')[0];
    if (domainName in this.enginePatternMap) {
      const data = {
        query: this._normalizeQuery(this._extractQuery(url, domainName)),
        origin: domainName,
        ts: timestampMS(),
      };
      this._addNewPosting(data);
      return data;
    }
    return null;
  }

  /**
   * This method normalizes a list of tokens. Umlauts are removed.
   * No stemming or lemmatization is performed.
   * Converttion of non-ASCII characters (umlauts, accents…) to their closest ASCII
   * equivalent (slug creation)
   * @param  {List[String]} tokenList [Input list of non-normalized tokens]
   * @return {List[String]} [normalized list of tokens]
   */
  normalizeTokenList(tokenList) {
    const combining = /[\u0300-\u036F]/g;
    const tokenizedList = [];
    tokenList.forEach((element) => {
      const tmp = element.normalize('NFKD').replace(combining, '');
      tokenizedList.push(tmp);
    });
    return tokenizedList;
  }

  /**
   * This method checks if a given information (tokens)
   * matches seen queries in a given period of time.
   * It is supposed that a match occured if
   * all "contatined" tokens were found in at least one query
   * while none fo the filter tokens were found.
   * @param  {Object} tokenData SHOULD BE ALREADY NORMALIZED TOKENS, the caller
   *                            should first call normalizeTokenList() method for each of them
   * {
   *   contained: [t1,t2,..],
   *   filtered: [ft1,ft2,...]
   * }
   * @param  {Long} time delta that is used to define interval [currentTime-delta, currentTime]
   *   ts
   * @return {[Boolean]}           [returns true if all the tokens are matched independently of the
   *                                order and all filter tokens are not
   *                                present in the normalized query]
   */
  matchTokens(tokenData, timeRange) {
    // get list of timestamps for the contained words
    // use contained list to grab the set of timestamps
    let finalSetTS = new Set();
    let tokenMissed = false;

    // as a safeguard we check that required keys are present
    // if not we return false
    if (!tokenData || !tokenData.contained || !tokenData.filtered) {
      return false;
    }

    tokenData.contained.forEach((containedToken) => {
      if (tokenMissed) {
        return;
      }
      const involvedTS = this.queryPostings[containedToken];
      if (involvedTS) {
        if (finalSetTS.size === 0) {
          finalSetTS = involvedTS;
        } else {
          finalSetTS = new Set([...finalSetTS].filter(x => involvedTS.has(x)));
        }
      } else {
        tokenMissed = true;
      }
    });

    if (finalSetTS.size === 0 || tokenMissed) {
      return false;
    }

    tokenData.filtered.forEach((filterToken) => {
      if (filterToken) {
        const involvedTS = this.queryPostings[filterToken];
        if (involvedTS) {
          finalSetTS.delete(involvedTS);
        }
      }
    });

    // now we have to exclude the filterTokensTs from finalSetTS
    // and check if the resulting set, if it is not empty and is in the TimeRange

    let threshold = -1;
    if (timeRange > 0) {
      threshold = timestampMS() - timeRange;
    }
    const inTheRange = [...finalSetTS].filter(x => x > threshold);

    return inTheRange.length > 0;
  }

// //////////////////////////////////////////////////////////////////////////////////
//                           Private Methods.
// //////////////////////////////////////////////////////////////////////////////////
  _extractQuery(url, domainName) {
    let query = '';
    const pattern = this.enginePatternMap[domainName];
    if (pattern) {
      const _mat = pattern.exec(url);

      if (_mat) {
        try {
          query = decodeURIComponent(_mat[1]).replace(/\+/g, ' ');
        } catch (e) {
          return null;
        }
        if (query) {
          return query.replace(/\s+/g, ' ').trim();
        }
      }
    }
    return null;
  }

  _normalizeQuery(query) {
    if (query) {
      return this._removePunctuation(query.toLowerCase());
    }
    return null;
  }

  _removePunctuation(query) {
    const punctuationless = query.replace(/[.,/#!$%^&*;:{}=\-_`~()"]/g, '');
    const finalString = punctuationless.replace(/\s{2,}/g, ' ');
    return finalString;
  }

  /**
   * Takes a data object that contains a query that is extracted from the URL,
   * splits into separate tokens and normalizes the tokens.
   * The posting list is constructed from the normalized tokens , origin and the TS
   * This method also creates the following structures
   * - index mapping
   * - posting dynamic map.
   * @param {Object} rawQuery [description]
   */
  _addNewPosting(data) {
    if (!data || !data.query || !data.origin || !data.ts) {
      return;
    }
    const tokens = data.query.split(' ');
    let normalizedTokens = [];

    if (tokens) {
      // fill in queryPostings structure
      // {
      //    normalizedToken: Set([ts1, ts2])
      // }
      normalizedTokens = this.normalizeTokenList(tokens);
      normalizedTokens.forEach((element) => {
        if (Object.prototype.hasOwnProperty.call(this.queryPostings, element)) {
          this.queryPostings[element].add(data.ts);
        } else {
          this.queryPostings[element] = new Set();
          this.queryPostings[element].add(data.ts);
        }
      });

      // fill in tsToPosingMap
      // {
      //   ts : (raw query, normalized query, ts, origin)
      // }
      // Here we assume that we do not run into situation when two queries have the same timestamp
      // if such a situation happens we simply override the posting for this specific timestampv
      this.tsToPostingMap[data.ts] = {
        full_query: data.query,
        origin: data.origin,
        tokens: normalizedTokens,
      };
    }

    // we also have to update the list of Postings that will be used for persistance of data
    this.listPostings.push({
      query: data.query,
      tokens: normalizedTokens,
      origin: data.origin,
      ts: data.ts
    });
    this.isDataDirty = true;
  }

  /**
   * This Method takes a posting list (loaded from DB) and constructs all
   * required in memory strucutres
   */
  _buildDynamicPostingsFromDB(postingList) {
    postingList.forEach((posting) => {
      if (posting && posting.tokens) {
        posting.tokens.forEach((token) => {
          if (this.queryPostings[token]) {
            this.queryPostings[token].add(posting.ts);
          } else {
            this.queryPostings[token] = new Set();
            this.queryPostings[token].add(posting.ts);
          }
        });

        this.tsToPostingMap[posting.ts] = {
          full_query: posting.query,
          origin: posting.origin,
          tokens: posting.tokens,
        };
      }
    });
  }

  _savePersistenceData() {
    if (!OffersConfigs.QUERY_POSTINGS_LOAD_FROM_DB || !this.db) {
      return Promise.resolve(true);
    }
    // is db dirty?
    if (!this.isDataDirty) {
      return Promise.resolve(true);
    }

    return this.db.saveDocData(STORAGE_DB_DOC_ID, {
      posting_list: this.listPostings.slice(-OffersConfigs.POSTING_SLICE),
    }).then(() => {
      this.isDataDirty = false;
      return true;
    });
  }

  _loadPersistentData() {
    // for testing comment the following check
    if (!OffersConfigs.QUERY_POSTINGS_LOAD_FROM_DB || !this.db) {
      return Promise.resolve(true);
    }

    return new Promise(resolve => this.db.getDocData(STORAGE_DB_DOC_ID).then((docData) => {
      if (!docData || !docData.posting_list) {
        resolve(false);
      }
      this.listPostings = docData.posting_list;
      this._buildDynamicPostingsFromDB(this.listPostings);
      this.isDataDirty = false;
      resolve(true);
    }).catch(() => {
      logger.error('unable to load the posting.');
    })
   );
  }
}
