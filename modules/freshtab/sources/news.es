/* eslint no-param-reassign: 'off' */

import hash from '../core/helpers/hash';
import NEWS_DOMAINS_LIST from './news-domains';
import console from '../core/console';
import prefs from '../core/prefs';
import i18n from '../core/i18n';
import inject from '../core/kord/inject';
import { extractSimpleURI } from '../core/url';
import { getDomains, isURLVisited } from '../platform/freshtab/history';
import BloomFilter from '../core/bloom-filter';
import NewsCache from './news-cache';
import config from './config';

const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * ONE_MINUTE;
const PRESS_CLIPPING_MAPPING = { 218038589: 'xing-pressespiegel_burda' };

const HBASED_RECOM_CACHE_UPDATE_INTERVAL = ONE_DAY;
const HABASED_NEWS_CACHE_UPDATE_INTERVAL = 30 * ONE_MINUTE;
const TOP_NEWS_CACHE_UPDATE_INTERVAL = 30;

const topNewsTypeKey = 'topnews';
const hbasedNewsTypeKey = 'yournews';
const prClBurdaNewsTypeKey = 'pr-cl-burda-news';
const breakingNewsTypeKey = 'breaking-news';

const NEWS_BACKENDS = ['de', 'de-tr-en', 'fr', 'us', 'gb', 'es', 'it'];
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';

const log = console.log.bind(console, 'freshtab.news');

let hbasedRecommendCacheObject = null;

function checkNewsTypeForHbasedRequest(newsPlacingRecord) {
  return (newsPlacingRecord.type === hbasedNewsTypeKey)
    || (newsPlacingRecord.type === prClBurdaNewsTypeKey);
}

function getNewsLanguage() {
  const locale = i18n.PLATFORM_LOCALE;

  for (let i = 0; i < NEWS_BACKENDS.length; i += 1) {
    if (locale.indexOf(NEWS_BACKENDS[i]) !== -1) {
      return NEWS_BACKENDS[i];
    }
  }

  // international news if the user uses and unsupported locale
  return 'intl';
}

function getNewsPreferedCountryParam() {
  const ftConfig = JSON.parse(prefs.get(FRESHTAB_CONFIG_PREF, '{}'));
  if (!ftConfig.news || !ftConfig.news.preferedCountry) {
    ftConfig.news = Object.assign({}, ftConfig.news, {
      preferedCountry: getNewsLanguage()
    });

    prefs.set(FRESHTAB_CONFIG_PREF, JSON.stringify(ftConfig));
  }

  return `&news_edition=${ftConfig.news.preferedCountry}`;
}

function getTopNewsList() {
  return inject.module('search').action('getNews', config.settings.ROTATED_TOP_NEWS, {
    params: getNewsPreferedCountryParam(),
  });
}

let topNewsCacheObject = null;

function getHbasedNewsObject() {
  function filterNotRequiredDomains(reqData, hbasedRecom) {
    function getHbasedNewsDict(hbasedResults) {
      return (hbasedResults
            && hbasedResults.results
            && hbasedResults.results[0]
            && hbasedResults.results[0].news)
            || {};
    }

    return new Promise((resolve) => {
      const hbNewsDict = getHbasedNewsDict(reqData);
      const newsPlacing = hbasedRecom.newsPlacing || [];

      const reqDomains = newsPlacing.filter(checkNewsTypeForHbasedRequest)
        .map(r => r.domain.split('/')[0]);

      const cleanhbNewsDict = {};

      reqDomains.forEach((domain) => {
        if (Object.prototype.hasOwnProperty.call(hbNewsDict, domain)) {
          cleanhbNewsDict[domain] = hbNewsDict[domain];
        }
      });
      resolve(cleanhbNewsDict);
    });
  }

  function requestHbasedNewsList(hbasedRecom) {
    let requestPromise;

    if (hbasedRecom.hashList.length === 0) {
      requestPromise = Promise.resolve({});
    } else {
      const query = JSON.stringify(hbasedRecom.hashList);
      requestPromise = inject.module('search').action('getNews', config.settings.HB_NEWS, { query })
        .then(reqData => filterNotRequiredDomains(reqData, hbasedRecom));
    }

    return requestPromise;
  }

  return hbasedRecommendCacheObject.getData().then(requestHbasedNewsList);
}

let hbasedNewsCacheObject = null;

export function mergeToGlobalVisitCount(urlDesc, visitCount, globalVisitCount) {
  function subUrlCheck(subUrl) {
    return subUrl
      && subUrl.indexOf('index') !== 0
      && subUrl.length > 2
      && subUrl.length < 15;
  }

  function ifCountSubLevel(urlPathList, recursionLevel) {
    return recursionLevel < 4
      && recursionLevel < urlPathList.length
      && !((urlPathList.length !== 1) && (recursionLevel >= (urlPathList.length - 1)))
      && subUrlCheck(urlPathList[recursionLevel]);
  }

  function countSubCategories(subVisitCount, urlPathList, vCount, recursionLevel) {
    if (ifCountSubLevel(urlPathList, recursionLevel)) {
      const subDomain = urlPathList[recursionLevel];

      if (!(subVisitCount[subDomain] && 'count' in subVisitCount[subDomain])) {
        subVisitCount[subDomain] = { count: 0, sub: {} };
      }

      subVisitCount[subDomain].count += vCount;

      recursionLevel += 1;
      subVisitCount[subDomain].sub = countSubCategories(
        subVisitCount[subDomain].sub,
        urlPathList,
        vCount,
        recursionLevel
      );
    }
    return subVisitCount;
  }

  let urlPathList = urlDesc.path.split('/');
  const domain = urlDesc.cleanHost;

  if (!(globalVisitCount[domain] && 'count' in globalVisitCount[domain])) {
    globalVisitCount[domain] = { count: 0, sub: {} };
  }

  globalVisitCount[domain].count += visitCount;

  // cut the first empty part
  if (!(urlPathList[0])) { urlPathList = urlPathList.slice(1); }

  globalVisitCount[domain].sub = countSubCategories(
    globalVisitCount[domain].sub,
    urlPathList,
    visitCount,
    0
  );
}

function composeDomainHasheList(newsPlacing, historyBasedRecommendationsCache) {
  function randomValueOf(obj) {
    const keys = Object.keys(obj);
    const rnd = Math.floor(Math.random() * keys.length);
    return parseInt(keys[rnd], 10);
  }

  function sortFunct(i, j) {
    return i < j;
  }

  function getDomainHash(record) {
    return parseInt(hash(record.domain.split('/')[0]), 10);
  }

  function subsRandomElement(cachedHashList, domainHashList, elementToAdd) {
    // filter out elements which should be in the hash list
    const randomHashes = cachedHashList.filter(i => domainHashList.indexOf(i) === -1);
    const randomeHashToReplace = randomHashes[randomValueOf(randomHashes)];

    cachedHashList[cachedHashList.indexOf(randomeHashToReplace)] = elementToAdd;
  }


  // extract domains' hashes for history based news
  const domainHashList = newsPlacing.filter(checkNewsTypeForHbasedRequest).map(getDomainHash);
  const cachedHashList = (historyBasedRecommendationsCache
    && historyBasedRecommendationsCache.hashList)
    || [];

  if (domainHashList.length !== 0) {
    const randomisedArraySize = 10;
    let numberOfAdditionalElementsToChange = 0;

    // fill array up to necessary number of hashes
    while (cachedHashList.length < randomisedArraySize) {
      cachedHashList.push(randomValueOf(NEWS_DOMAINS_LIST));
    }

    // fill array with necessary domain hashes
    domainHashList.forEach((domainHash) => {
      if (cachedHashList.indexOf(domainHash) === -1) {
        // substitute the necessary element
        subsRandomElement(cachedHashList, domainHashList, domainHash);
        numberOfAdditionalElementsToChange += 1;
      }
    });

    // substitute additional rand. elements
    while (numberOfAdditionalElementsToChange > 0) {
      subsRandomElement(cachedHashList, domainHashList, randomValueOf(NEWS_DOMAINS_LIST));
      numberOfAdditionalElementsToChange -= 1;
    }

    cachedHashList.sort(sortFunct);
  }

  return cachedHashList;
}

function normalizeGlobalVisitCount(globalVisitCount) {
  function normalizeRecursion(subUrlCount, sum) {
    Object.keys(subUrlCount).forEach((k) => {
      subUrlCount[k].ratio = subUrlCount[k].count / sum;
      subUrlCount[k].sub = normalizeRecursion(subUrlCount[k].sub, subUrlCount[k].count);
    });
    return subUrlCount;
  }

  const glVisit = globalVisitCount;
  let domainsSum = 0;

  Object.keys(glVisit).forEach((k) => {
    domainsSum += glVisit[k].count;
  });

  Object.keys(glVisit).forEach((k) => {
    glVisit[k].ratio = glVisit[k].count / domainsSum;
    glVisit[k].sub = normalizeRecursion(glVisit[k].sub, glVisit[k].count);
  });
  return glVisit;
}

function composeHistoryBasedRecommendations(globalVisitCount) {
  function sortFunct(i, j) {
    return i.count < j.count;
  }

  function getPressClipping(glVisitCount) {
    function getPressClipMapping(domain) {
      return PRESS_CLIPPING_MAPPING[parseInt(hash(domain), 10)] || false;
    }
    const glVisit = glVisitCount;
    const pressClipList = [];
    const prClipThreshold = 5;

    let pressClipMapping;
    Object.keys(glVisit).forEach((domain) => {
      pressClipMapping = getPressClipMapping(domain);
      if ((typeof pressClipMapping === 'string') && (glVisit[domain].count > prClipThreshold)) {
        glVisit[domain].key = pressClipMapping;
        pressClipList.push(glVisit[domain]);
      }
    });
    return pressClipList;
  }

  function getThreeTopNewsDomains(glVisitCount) {
    function checkIfNewsDomain(domain) {
      return NEWS_DOMAINS_LIST[parseInt(hash(domain), 10)] || false;
    }

    const domainCountThreshold = 20;
    const glVisit = glVisitCount;
    const topDomainsList = [];

    Object.keys(glVisit).forEach((domain) => {
      if ((Object.prototype.hasOwnProperty.call(glVisit, domain))
          && (glVisit[domain].count > domainCountThreshold)
          && (checkIfNewsDomain(domain))) {
        glVisit[domain].key = domain;
        topDomainsList.push(glVisit[domain]);
      }
    });

    topDomainsList.sort(sortFunct);
    return topDomainsList.slice(0, 3);
  }

  function addDomainBasedNews(domainCount, articlesToAdd) {
    const subDomainRatioThreshold = 0.6;
    const newsPlacing = [];
    let addedOnSubdomainLevel = 0;

    let numArtToAdd = articlesToAdd;

    // add news placement on sub domain level
    Object.keys(domainCount.sub).forEach((subDomain) => {
      if (domainCount.sub[subDomain].ratio > subDomainRatioThreshold) {
        addedOnSubdomainLevel = Math.max(
          Math.floor(numArtToAdd * domainCount.sub[subDomain].ratio),
          1
        );
        newsPlacing.push({
          type: hbasedNewsTypeKey,
          domain: [domainCount.key, subDomain].join('/'),
          number: addedOnSubdomainLevel
        });
        numArtToAdd -= addedOnSubdomainLevel;
      }
    });

    // add placement for domain level
    if (numArtToAdd > 0) {
      newsPlacing.push({
        type: hbasedNewsTypeKey,
        domain: domainCount.key,
        number: numArtToAdd
      });
    }

    return newsPlacing;
  }

  let newsPlacing = [];

  const pressCliping = getPressClipping(globalVisitCount);
  const topDomainsList = getThreeTopNewsDomains(globalVisitCount);

  // always add 3 general top news
  newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 3 });

  // in case of press clipping add one article instead of one of top news articles
  if (pressCliping.length > 0) {
    newsPlacing[0].number = 2;
    newsPlacing.push({ type: prClBurdaNewsTypeKey, domain: pressCliping[0].key, number: 1 });
  }

  // add history based news depend from number of history based domains
  switch (topDomainsList.length) {
    // only top news
    case 0:
      newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 9 });
      break;

    // 6 top news, 6 from history based domain
    case 1:
      newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 3 });
      newsPlacing = newsPlacing.concat(addDomainBasedNews(topDomainsList[0], 6));
      break;

    // 3 top news, 5 for first history based domain, 4 for second
    case 2:
      newsPlacing = newsPlacing.concat(addDomainBasedNews(topDomainsList[0], 5));
      newsPlacing = newsPlacing.concat(addDomainBasedNews(topDomainsList[1], 4));
      break;

    // 3 top news, 3 from each of 3 history based domains
    case 3:
      topDomainsList.forEach((domainCount) => {
        newsPlacing = newsPlacing.concat(addDomainBasedNews(domainCount, 3));
      });
      break;
    default:
      log(`Wrong number top domains:${topDomainsList.length}.`);
  }

  log(newsPlacing);
  return newsPlacing;
}

/**
* Process history to get recommendations for history based news
* @method getHistoryBasedRecommendations
*/
export function getHistoryBasedRecommendations(oldCacheData) {
  function getGlobalVisitCountFromPref() {
    try {
      const globalVisitCount = prefs.get('globalVisitCount', false);
      if (globalVisitCount) {
        log('Global visit count is taken from the preference.');
      }
      return JSON.parse(globalVisitCount);
    } catch (err) {
      log(`Error parsing global visit count: ${err}`);
      return false;
    }
  }

  function checkIfDomainForCounting(domain) {
    const _hash = parseInt(hash(domain), 10);
    return NEWS_DOMAINS_LIST[_hash] || PRESS_CLIPPING_MAPPING[_hash];
  }

  // take history visit count only for the exact domain and sub domains, not for articles' url
  function pathHasIndex(path) {
    const pathArray = path.split('/');
    const lastPathElement = pathArray[pathArray.length - 1];
    return !lastPathElement
      || pathArray.length === 1
      || lastPathElement.indexOf('index') === 0;
  }

  function addHRecordToGlobalVisitCount(record, globalVisitCount) {
    const urlData = extractSimpleURI(record.url);
    if (checkIfDomainForCounting(urlData.cleanHost)) {
      let domainVisitCount;
      if (pathHasIndex(urlData.path)) {
        domainVisitCount = record.visit_count;
      } else {
        domainVisitCount = 1;
      }
      mergeToGlobalVisitCount(urlData, domainVisitCount, globalVisitCount);
    }
  }

  let globalVisitCount = {};

  return getDomains().then((records) => {
    records.forEach(
      record => addHRecordToGlobalVisitCount(record, globalVisitCount)
    );
  }).then(() => {
    globalVisitCount = normalizeGlobalVisitCount(globalVisitCount);
    log(globalVisitCount);

    globalVisitCount = getGlobalVisitCountFromPref() || globalVisitCount;

    const newsPlacing = composeHistoryBasedRecommendations(globalVisitCount);
    const historyBasedRecommendations = {
      newsPlacing,
      hashList: composeDomainHasheList(newsPlacing, oldCacheData),
    };

    log(historyBasedRecommendations);

    return historyBasedRecommendations;
  });
}

function getTopNewsArticles(topNCache) {
  return (topNCache
        && topNCache.results
        && topNCache.results[0]
        && topNCache.results[0].articles)
        || [];
}

export function composeNewsList(historyObject, topNewsCache, hbasedResults) {
  function getTopNewsVersion(topNCache) {
    return (topNCache.results
          && topNCache.results[0]
          && topNCache.results[0].news_version)
          || 0;
  }

  function notAlreadyInList(articleTocheck, freshtabArticlesList) {
    function urlCheck(art) {
      return (articleTocheck.url !== art.url);
    }
    // check if articles not in ATN clusters using bloom filter
    function bloomFilterCheck(art) {
      if (!art.bloomFilterObj && !art.cluster_articles_bloomfilter) {
        return true;
      }
      if (!art.bloomFilterObj) {
        const clusterArticlesBloomfilter = JSON.parse(art.cluster_articles_bloomfilter);
        const bloomFilterObj = new BloomFilter(
          clusterArticlesBloomfilter.bkt,
          clusterArticlesBloomfilter.k
        );

        art.bloomFilterObj = bloomFilterObj;
      }
      if (art.bloomFilterObj) {
        const isInList = art.bloomFilterObj.testSingle(articleTocheck.url);
        if (isInList) {
          console.log('article found in Bloom Filter: ', articleTocheck.url);
          return !isInList;
        }
      }
      return true;
    }

    /**
    * (articleTocheck) should not be already in the list and not duplicated in cluster bloomfilter
    * NOTE: if articleTocheck already has a bloomfilter, then we skipp checking
    * the duplication in previous clusters bloomfilter
    */
    return freshtabArticlesList.every(urlCheck)
      && (
        articleTocheck.cluster_articles_bloomfilter
        || freshtabArticlesList.every(bloomFilterCheck)
      );
  }

  function mergeToList(
    articlesToMerge,
    freshtabArticlesList,
    numberOfNewsToMerge,
    sourceArticleType,
    checkIfAlreadyInHistory,
    urlPatern
  ) {
    function mergeCheck(article, checkHist, urlDomainPatern) {
      return (!(!(article.breaking === true) && checkHist && article.isVisited)
            && (notAlreadyInList(article, freshtabArticlesList))
            && (article.url.indexOf(urlDomainPatern) !== -1));
    }
    function mergeArticle(article, returnList) {
      const artAdd = article;
      if (artAdd.breaking === true) {
        artAdd.type = breakingNewsTypeKey;
      } else {
        artAdd.type = sourceArticleType;
      }

      // Insert `artAdd` after the last article of same type already in `returnList`.
      let articleIndex = -1;
      returnList.forEach(({ type }, index) => {
        if (type === artAdd.type) {
          articleIndex = index;
        }
      });

      if (articleIndex === -1) {
        returnList.push(artAdd);
      } else {
        returnList.splice(articleIndex + 1, 0, artAdd);
      }
    }

    let numToMerge = numberOfNewsToMerge;
    const urlDomainPatern = urlPatern || '';

    articlesToMerge.some((article) => {
      if (numToMerge !== 0) {
        if (mergeCheck(article, checkIfAlreadyInHistory, urlDomainPatern)) {
          mergeArticle(article, freshtabArticlesList);
          numToMerge -= 1;
        }
        return false;
      }
      // exit loop if all articles are added
      return true;
    });

    return numToMerge;
  }

  function mergeTopNews(topNewList, freshtabArticlesList, numberOfNewsToMerge) {
    let checkIfInHistory = true;

    const notMergedNewsNumber = mergeToList(
      topNewList,
      freshtabArticlesList,
      numberOfNewsToMerge,
      topNewsTypeKey,
      checkIfInHistory
    );

    // fill empty slots with articles without check with history
    checkIfInHistory = false;
    mergeToList(
      topNewList,
      freshtabArticlesList,
      notMergedNewsNumber,
      topNewsTypeKey,
      checkIfInHistory
    );

    return freshtabArticlesList;
  }

  function mergePressClippingNews(
    hbasedNewsDict,
    topNewList,
    freshtabArticlesList,
    newsPlacementRecord
  ) {
    const pressClippingName = newsPlacementRecord.domain || '';
    const numberOfNewsToMerge = newsPlacementRecord.number || 0;
    const sourceArticleType = prClBurdaNewsTypeKey;
    const checkIfInHistory = true;

    const hbasedNewsList = hbasedNewsDict[pressClippingName] || [];

    let returnNewsList = freshtabArticlesList;

    const notMergedNewsNumber = mergeToList(
      hbasedNewsList,
      returnNewsList,
      numberOfNewsToMerge,
      sourceArticleType,
      checkIfInHistory
    );

    // if no press cliping can be merged, merge top news instead
    returnNewsList = mergeTopNews(topNewList, returnNewsList, notMergedNewsNumber);

    return returnNewsList;
  }

  function mergeHbasedNews(hbasedNewsDict, topNewList, freshtabArticlesList, newsPlacementRecord) {
    const domainUrlPath = newsPlacementRecord.domain || '';
    const numberOfNewsToMerge = newsPlacementRecord.number || 0;
    const checkIfInHistory = true;

    const domain = domainUrlPath.split('/')[0];
    const hbasedNewsList = hbasedNewsDict[domain] || [];

    let returnNewsList = freshtabArticlesList;
    // merge news according to url path
    let notMergedNewsNumber = mergeToList(
      hbasedNewsList,
      returnNewsList,
      numberOfNewsToMerge,
      hbasedNewsTypeKey,
      checkIfInHistory,
      domainUrlPath
    );

    // if not all news were mergen according to url path, merge news only from domain
    notMergedNewsNumber = mergeToList(
      hbasedNewsList,
      returnNewsList,
      notMergedNewsNumber,
      hbasedNewsTypeKey,
      checkIfInHistory
    );

    // if no hbased news can be merged, merge top news
    returnNewsList = mergeTopNews(topNewList, returnNewsList, notMergedNewsNumber);

    return returnNewsList;
  }

  function forceDividableByThreeFormat(list) {
    return list.slice(0, 3).concat(list.slice(3, list.length - (list.length % 3)));
  }

  function extendListIfOnlyTopNews(freshtabNewsList, topNewList) {
    function recordTypeCheck(record) {
      return record.type !== hbasedNewsTypeKey;
    }

    const notMergetTopNewsNumber = topNewList.length - freshtabNewsList.length;

    let returnNewsList = freshtabNewsList;
    if ((notMergetTopNewsNumber > 0) && freshtabNewsList.every(recordTypeCheck)) {
      returnNewsList = mergeTopNews(topNewList, freshtabNewsList, notMergetTopNewsNumber);
    }
    return returnNewsList;
  }

  function sortByScore(list) {
    function sortFunct(i, j) {
      // if score is not presented put record on top
      return (i.score || (10 ** 6)) < (j.score || (10 ** 6));
    }
    // sort all news apart from first 3
    return list.slice(0, 3).concat(list.slice(3, 15).sort(sortFunct));
  }

  return new Promise((resolve) => {
    let freshtabArticlesList = [];
    const newsPlacement = historyObject.newsPlacing
      || [{ type: topNewsTypeKey, domain: topNewsTypeKey, number: 9 }];

    const topNewsList = topNewsCache;
    const hbasedNewsDict = hbasedResults;

    // merge news according to news placing
    newsPlacement.forEach((record) => {
      switch (record.type) {
        case topNewsTypeKey:
          freshtabArticlesList = mergeTopNews(topNewsList, freshtabArticlesList, record.number);
          break;
        case hbasedNewsTypeKey:
          freshtabArticlesList = mergeHbasedNews(
            hbasedNewsDict,
            topNewsList,
            freshtabArticlesList,
            record
          );
          break;
        case prClBurdaNewsTypeKey:
          freshtabArticlesList = mergePressClippingNews(
            hbasedNewsDict,
            topNewsList,
            freshtabArticlesList,
            record
          );
          break;
        default:
          log(`Not handled news type in news placing ${record.type}`);
      }
    });

    freshtabArticlesList = sortByScore(freshtabArticlesList);
    freshtabArticlesList = forceDividableByThreeFormat(freshtabArticlesList);
    freshtabArticlesList = extendListIfOnlyTopNews(freshtabArticlesList, topNewsList);

    log(freshtabArticlesList);
    resolve({
      newsList: freshtabArticlesList,
      topNewsVersion: getTopNewsVersion(topNewsCache),
    });
  });
}

function addVisitedFlagToArticles(articlesList) {
  const promiseList = articlesList.map(article =>
    isURLVisited(article.url).then((isVisited) => {
      article.isVisited = isVisited;
      return article;
    }));

  return Promise.all(promiseList);
}

function checkTopNewsIfInHistory(topNewsCache) {
  return addVisitedFlagToArticles(getTopNewsArticles(topNewsCache));
}

function checkHbasedNewsIfInHistory(hbNewsDict) {
  const promiseList = Object.keys(hbNewsDict).map(domain =>
    new Promise((resolve) => {
      addVisitedFlagToArticles(hbNewsDict[domain]).then((articlesList) => {
        resolve([domain, articlesList]);
      });
    }));

  return Promise.all(promiseList).then((hbNewsChecked) => {
    const hbDictResult = {};
    hbNewsChecked.forEach((r) => {
      hbDictResult[r[0]] = r[1];
    });
    return hbDictResult;
  });
}

const CliqzFreshTabNews = {
  /**
  * @method init
  */
  init: () => {
    log('init');
  },
  /**
  * @method unload
  */
  unload: () => {
    log('unloaded');
  },
  getNews: () => {
    let topNewsL;
    let hbObject;

    if (topNewsCacheObject === null) {
      topNewsCacheObject = new NewsCache(
        'freshTab-topnews-cache',
        TOP_NEWS_CACHE_UPDATE_INTERVAL,
        getTopNewsList,
        false
      );
    }

    if (hbasedNewsCacheObject === null) {
      hbasedNewsCacheObject = new NewsCache(
        'freshTab-hbased-cache',
        HABASED_NEWS_CACHE_UPDATE_INTERVAL,
        getHbasedNewsObject,
        true
      );
    }

    if (hbasedRecommendCacheObject === null) {
      hbasedRecommendCacheObject = new NewsCache(
        'freshTab-recommend-cache',
        HBASED_RECOM_CACHE_UPDATE_INTERVAL,
        getHistoryBasedRecommendations,
        true
      );
    }

    return Promise.all([
      topNewsCacheObject.getData().then(checkTopNewsIfInHistory),
      hbasedNewsCacheObject.getData().then(checkHbasedNewsIfInHistory),
    ]).then(([topNewsList, hbasedObject]) => {
      topNewsL = topNewsList;
      hbObject = hbasedObject;
      return hbasedRecommendCacheObject.getData();
    }).then(historyObject => composeNewsList(historyObject, topNewsL, hbObject));
  },
  resetTopNews: () => {
    topNewsCacheObject.reset();
  },
  NEWS_BACKENDS,
  getNewsLanguage
};

export default CliqzFreshTabNews;
