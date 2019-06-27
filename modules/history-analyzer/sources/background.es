import background from '../core/base/background';
import history from '../core/history-service';
import prefs from '../core/prefs';

import HistoryProcessor from './history-processor';
import HistoryStream from './history-stream';
import QueryStream from './query-stream';
import logger from './logger';
import Defer from '../core/helpers/defer';

const VERSION_PREF = 'history-analyzer-version';
const VERSION = 3;


/**
  @namespace history-analyzer
  @class Background
 */
export default background({
  requiresServices: ['pacemaker'],
  historyProcessor: null,
  historyStream: null,
  queryStream: null,

  async init() {
    logger.debug('Init history-analyzer');
    this.historyProcessor = new HistoryProcessor();
    this.historyStream = new HistoryStream(this.historyProcessor);
    this.queryStream = new QueryStream(this.historyProcessor, this.historyStream);
    this.historyStreamReady = new Defer();
    this.queryStreamReady = new Defer();

    this.unloadAll = () => {
      this.historyProcessor.unload();
      this.historyStream.unload();
      this.queryStream.unload();
    };

    this.destroyAll = () => Promise.all([
      this.historyProcessor.destroy(),
      this.historyStream.destroy(),
      this.queryStream.destroy(),
    ]);

    this.initAll = () => Promise.all([
      this.historyStream.init().then(this.historyStreamReady.resolve),
      this.queryStream.init().then(this.queryStreamReady.resolve),
    ]).then(() => this.historyProcessor.init());

    let ongoingReset = false;
    this.removePersistedData = async () => {
      if (ongoingReset) {
        logger.log('requested reset while resetting, ignoring...');
        return;
      }
      ongoingReset = true;
      logger.log('remove persisted data');
      try {
        await this.unloadAll();
        await this.destroyAll();
        await this.initAll();
      } catch (ex) {
        logger.error('while resetting history-analyzer', ex);
      }
      ongoingReset = false;
    };

    // Check if version of the analyzer changed, and reset storage if needed
    let initPromise = Promise.resolve();
    const registeredVersion = prefs.get(VERSION_PREF, null);
    if (registeredVersion !== VERSION) {
      logger.log(`Version changed (${registeredVersion} -> ${VERSION}): reset.`);
      prefs.set(VERSION_PREF, VERSION);
      initPromise = this.destroyAll();
    }

    return initPromise.then(() => this.initAll()).then(() => {
      try {
        // This event is triggered for full history reset, or if individual
        // entries are removed. We currently reset the history-analyzer for
        // both, which is sub-optimal (but safe privacy-wise). It would be nice
        // to find a more efficient way to do this.
        if (history) { history.onVisitRemoved.addListener(this.removePersistedData); }
      } catch (e) {
        logger.error('Error setting the history onVisitRemoved listener: ', e);
      }
    });
  },

  unload() {
    try {
      if (history) { history.onVisitRemoved.removeListener(this.removePersistedData); }
    } catch (e) {
      logger.error('Error removing the history onVisitRemoved listener', e);
    }

    this.unloadAll();
    this.historyProcessor = null;
    this.historyStream = null;
    this.queryStream = null;
  },

  beforeBrowserShutdown() {
  },

  events: {
    'content:location-change': function handleLocationChange(...args) {
      if (this.historyStream !== null) {
        this.historyStreamReady.promise.then(() =>
          this.historyStream.handleLocationChange(...args));
      }
    },
    'urlbar:input': function handleUrlBarInput(...args) {
      if (this.queryStream !== null) {
        this.queryStreamReady.promise.then(() =>
          this.queryStream.handleUrlBarInput(...args));
      }
    },
  },

  actions: {
    async* query({ after, before, queries, urls }) {
      if (queries !== undefined) {
        // eslint-disable-next-line semi
        for await (const query of this.queryStream.query({
          after,
          before,
          tokens: queries,
        })) {
          yield query;
        }
      }

      if (urls !== undefined) {
        // eslint-disable-next-line semi
        for await (const url of this.historyStream.query({
          after,
          before,
          tokens: urls,
        })) {
          yield url;
        }
      }
    },

    info() {
      return Promise.hash({
        historyInfo: this.historyStream.info(),
        queryInfo: this.queryStream.info(),
      });
    }
  },
});
