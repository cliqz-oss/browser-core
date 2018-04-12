import EventEmitter from '../core/event-emitter';
import { compactTokens } from '../core/pattern-matching';

import IndexedStream from './indexed-stream';
import TIME_LIMIT_MS from './config';
import logger from './logger';
import tokenize from './utils';


export default class HistoryStream extends EventEmitter {
  constructor(historyProcessor) {
    super(['url']);

    this.stream = new IndexedStream('history-stream');

    // Process past history async and build the index
    historyProcessor.on('processedVisits', visits => this.stream.pushMany(visits));
  }

  init() {
    return this.stream.init()
      .then(() => this.deleteDataOlderThan(Date.now() - TIME_LIMIT_MS));
  }

  unload() {
    this.stream.unload();
  }

  destroy() {
    return this.stream.destroy();
  }

  deleteDataOlderThan(ts) {
    return this.stream.deleteDataOlderThan(ts);
  }

  info() {
    return this.stream.info();
  }

  handleLocationChange({ url, isPrivate, isLoadingDocument }) {
    if (!isPrivate && isLoadingDocument) {
      const historyEntry = {
        ts: Date.now(),
        url,
        tokens: compactTokens(tokenize(url)),
      };

      logger.debug('got state change', historyEntry);
      this.emit('url', historyEntry);
      return this.stream.push(historyEntry);
    }

    return Promise.resolve();
  }

  all() {
    return this.stream.all();
  }

  query(...args) {
    return this.stream.query(...args);
  }
}
