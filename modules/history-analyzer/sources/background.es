import background from '../core/base/background';
import history from '../core/history-service';
import prefs from '../core/prefs';

import HistoryProcessor from './history-processor';
import HistoryStream from './history-stream';
import QueryStream from './query-stream';
import logger from './logger';
import Defer from '../core/app/defer';

const VERSION_PREF = 'history-analyzer-version';
const VERSION = 2;


/**
  @namespace <namespace>
  @class Background
 */
export default background({
  historyProcessor: null,
  historyStream: null,
  queryStream: null,

  init() {
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

    // subscribe to the history listener module if have one
    this.removePersistedData = () => Promise.resolve()
      .then(() => logger.log('remove persisted data'))
      .then(() => this.unloadAll())
      .then(() => this.destroyAll())
      .then(() => this.initAll());

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
        history.onVisitRemoved.addListener(this.removePersistedData);
      } catch (e) {
        logger.error('Error setting the history remove listener: ', e);
      }
    });
  },

  unload() {
    try {
      history.onVisitRemoved.removeListener(this.removePersistedData);
    } catch (e) {
      logger.error('Error removing the history remove listener', e);
    }

    this.unloadAll();
  },

  beforeBrowserShutdown() {
  },

  events: {
    'content:location-change': function handleLocationChange(...args) {
      if (this.historyStream !== null) {
        this.historyStreamReady.promise.then(() =>
          this.historyStream.handleLocationChange(...args)
        );
      }
    },
    'urlbar:input': function handleUrlBarInput(...args) {
      if (this.queryStream !== null) {
        this.queryStreamReady.promise.then(() =>
          this.queryStream.handleUrlBarInput(...args)
        );
      }
    },
  },

  actions: {
    query({ after, before, queries, urls }) {
      let qPromise = Promise.resolve([]);
      if (queries !== undefined) {
        qPromise = this.queryStream.query({
          after,
          before,
          tokens: queries,
        });
      }

      let hPromise = Promise.resolve([]);
      if (urls !== undefined) {
        hPromise = this.historyStream.query({
          after,
          before,
          tokens: urls,
        });
      }

      return Promise.hash({
        queries: qPromise,
        urls: hPromise,
      });
    },

    info() {
      return Promise.hash({
        historyInfo: this.historyStream.info(),
        queryInfo: this.queryStream.info(),
      });
    }
  },
});
