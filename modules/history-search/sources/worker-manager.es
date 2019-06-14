import Spanan from 'spanan';
import { getResourceUrl } from '../core/platform';
import pacemaker from '../core/services/pacemaker';
import Worker from '../platform/worker';
import { hasOpenedTabWithUrl } from '../core/tabs';
import { chrome } from '../platform/globals';

const LIMIT = 50; // TODO: reduce this limit

const isValidUrl = url => (url.indexOf('chrome://cliqz') !== 0
  && url.indexOf('resource://cliqz') !== 0
  && url.indexOf('moz-extension://') !== 0
  && url.indexOf('https://cliqz.com/search?q=') !== 0);

const isValidBookmarkUrl = url => url && url.startsWith('http');

const confidence = (matchingScore, length) => {
  const z = 1.281551565545;
  const p = matchingScore / length;
  const left = p + 1 / (2 * length) * z * z;
  const right = z * Math.sqrt(p * (1 - p) / length + z * z / (4 * length * length));
  const under = 1 + 1 / length * z * z;
  return (left - right) / under;
};

const redditScore = (count, time, matchingScore, fieldLength, isBookmarked, typedCount) => {
  const rankingScore = Math.log10(count) + (3600 / (Date.now() - time));
  const confidenceScore = confidence(matchingScore, fieldLength);
  const bookmarkScore = isBookmarked ? 1.1 : 1;
  const typedCountScore = 1 + (typedCount * 0.05);
  return (rankingScore * bookmarkScore * typedCountScore + confidenceScore) * matchingScore;
};

const resultStyle = (result) => {
  const styles = ['favicon'];
  if (result[0].is_bookmarked) {
    styles.push('bookmark');
  }
  if (hasOpenedTabWithUrl(result[0].match_fields.Url.field)) {
    styles.push('switchtab');
  }
  return styles.join(' ');
};

export default class WorkerManager {
  actions = {
    notifyWasmLoaded: () => {
      // After web assembly file has been loaded, add some history items into it
      this.isWorkerReady = true;
      this.addHistoryItems();
    },
  };

  constructor() {
    this.bookmarksObj = {};
    this.isWorkerReady = false;

    chrome.history.onVisited.addListener(this.onVisited);
    chrome.history.onVisitRemoved.addListener(this.onVisitRemoved);
    const url = getResourceUrl('history-search/worker.bundle.js');
    const worker = new Worker(url);

    const workerWrapper = new Spanan(({ action, args, uuid }) => {
      const data = args[0].data;
      worker.postMessage({
        action,
        data,
        uuid
      });
    });

    worker.onmessage = ({ data: message }) => workerWrapper.handleMessage(message);
    this.importedActions = workerWrapper.createProxy();
    workerWrapper.export(this.actions);
    this.worker = worker; // For unloading
  }

  sendMessageToWorker({ action, data }) {
    if (!this.isWorkerReady) {
      return Promise.resolve();
    }

    return this.importedActions[action]({ data });
  }

  addBookmarks = (bookmarks) => {
    for (let i = 0; i < bookmarks.length; i += 1) {
      const bookmark = bookmarks[i];
      if (isValidBookmarkUrl(bookmark.url)) {
        this.bookmarksObj[bookmark.url] = bookmark;
      }

      if (bookmark.children) {
        this.addBookmarks(bookmark.children);
      }
    }
  }

  addHistoryItems() {
    const limit = 50000;
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000; // ms
    const startDate = Date.now() - (ONE_MONTH * 6); // TODO: to be edited

    chrome.bookmarks.getTree((data) => {
      this.addBookmarks(data);
      chrome.history.search(
        { text: '', startTime: startDate, maxResults: limit },
        (rawResults) => {
          const results = rawResults.reduce((filtered, res) => {
            let isBookmarked = false;
            if (isValidUrl(res.url) && res.visitCount > 0) {
              if (this.bookmarksObj[res.url]) {
                isBookmarked = true;
                delete this.bookmarksObj[res.url];
              }

              filtered.push({
                url: res.url,
                title: res.title,
                visitCount: res.visitCount,
                lastVisitTime: res.lastVisitTime,
                isBookmarked,
                typedCount: res.typedCount,
              });
            }

            return filtered;
          }, []);
          // Left over, i.e unvisited bookmarks
          const unvisitedBookmarks = Object.keys(this.bookmarksObj).map(key => ({
            url: key,
            title: this.bookmarksObj[key].title,
            visitCount: 1, // Has to be greater than 0
            lastVisitTime: this.bookmarksObj[key].dateAdded,
            isBookmarked: true,
            typedCount: 0,
          }));
          this.sendMessageToWorker({
            action: 'addHistoryItems',
            data: results.concat(unvisitedBookmarks),
          });
        }
      );
    });
  }

  updateHistoryItem(item) {
    this.sendMessageToWorker({
      action: 'updateHistoryItem',
      data: item,
    });
  }

  removeHistoryItems(urls) {
    this.sendMessageToWorker({
      action: 'removeHistoryItems',
      data: urls,
    });
  }

  searchFromHistory(query, callback) {
    this.sendMessageToWorker({
      action: 'searchFromHistory',
      data: { query: query.replace(/ /g, ''), count: LIMIT },
    }).then((response) => {
      const rawResults = JSON.parse(response.rawResults);

      const results = rawResults.map(result => ({
        comment: result[0].match_fields.Title.field,
        value: result[0].match_fields.Url.field,
        label: result[0].match_fields.Url.field,
        style: resultStyle(result),
        image: `page-icon:${result[0].match_fields.Url.field}`, // TODO: do we need this ?
        score: redditScore(
          result[0].visit_count,
          result[0].last_visit_date,
          result[1],
          result[0].match_fields.Url.field_len + result[0].match_fields.Title.field_len,
          result[0].is_bookmarked,
          result[0].typed_count,
        ),
      })).sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Show 3 top domains when there is no history
      if (!(results.length || query)) {
        results.push(...[
          {
            index: 1,
            style: '',
            comment: 'Amazon.com: Online Shopping for Electronics, Apparel, Computers, Books, DVDs & more',
            value: 'https://amazon.com',
            query,
          },
          {
            index: 2,
            style: '',
            comment: 'YouTube',
            value: 'https://youtube.com',
            query,
          },
          {
            index: 3,
            style: '',
            comment: 'Facebook',
            value: 'https://facebook.com',
            query,
          },
        ]);
      }

      callback({
        query,
        results,
        ready: true,
      });
    });
  }

  onVisited = (visit) => {
    pacemaker.setTimeout(() => {
      chrome.history.search(
        { text: visit.url, startTime: Math.floor(visit.lastVisitTime), maxResults: 1 },
        (results) => {
          if (results.length) {
            this.updateHistoryItem(results[0]);
          }
        }
      );
    }, 1000);
  }

  onVisitRemoved = ({ urls = [] }) => {
    if (urls.length) {
      this.removeHistoryItems(urls);
    }
  }

  unload() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    chrome.history.onVisited.removeListener(this.onVisited);
    chrome.history.onVisitRemoved.removeListener(this.onVisitRemoved);
  }
}
