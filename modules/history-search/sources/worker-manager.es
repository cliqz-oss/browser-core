import Spanan from 'spanan';
import { getResourceUrl } from '../core/platform';
import Worker from '../platform/worker';
import { chrome } from '../platform/globals';

const LIMIT = 30;

const isValidUrl = url => (url.indexOf('chrome://cliqz') !== 0
  && url.indexOf('resource://cliqz') !== 0
  && url.indexOf('moz-extension://') !== 0
  && url.indexOf('https://cliqz.com/search?q=') !== 0);

const confidence = (matchingScore, length) => {
  const z = 1.281551565545;
  const p = matchingScore / length;
  const left = p + 1 / (2 * length) * z * z;
  const right = z * Math.sqrt(p * (1 - p) / length + z * z / (4 * length * length));
  const under = 1 + 1 / length * z * z;
  return (left - right) / under;
};

const redditScore = (count, time, matchingScore, fieldLength) => {
  const rankingScore = Math.log10(count) + (3600 / (Date.now() - time));
  const confidenceScore = confidence(matchingScore, fieldLength);
  return (rankingScore + confidenceScore) * matchingScore;
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
    this.isWorkerReady = false;

    chrome.history.onVisited.addListener(this.onVisited);
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

  addHistoryItems() {
    const limit = 50000;
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000; // ms
    const startDate = Date.now() - (ONE_MONTH * 6); // TODO: to be edited

    chrome.history.search(
      { text: '', startTime: startDate, maxResults: limit },
      (results) => {
        this.sendMessageToWorker({
          action: 'addHistoryItems',
          data: results.filter(res => isValidUrl(res.url) && res.visitCount > 0),
        });
      }
    );
  }

  updateHistoryItem(item) {
    this.sendMessageToWorker({
      action: 'updateHistoryItem',
      data: item,
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
        style: 'favicon',
        image: `page-icon:${result[0].match_fields.Url.field}`, // TODO: do we need this ?
        score: redditScore(result[0].visit_count, result[0].last_visit_date,
          result[1], result[0].match_fields.Url.field_len),
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
    setTimeout(() => {
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

  unload() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    chrome.history.onVisited.removeListener(this.onVisited);
  }
}
