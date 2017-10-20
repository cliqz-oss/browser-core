import inject from '../../core/kord/inject';
import Feature from './feature';

const MOD_NAME = 'history-analyzer';

/**
 * Interface for a feature
 */
export default class HistoryFeature extends Feature {
  constructor() {
    super('history');
    this.mod = null;
    this.ongoingQueries = new Map();
  }

  // to be implemented by the inherited classes
  init() {
    this.mod = inject.module(MOD_NAME);
    return true;
  }

  unload() {
    return true;
  }

  isAvailable() {
    return this.mod.isEnabled();
  }


  // ///////////////////////////////////////////////////////////////////////////
  //                        INTERFACE
  //

  hasCachedData(pid) {
    return this.mod.action('hasCachedData', pid);
  }

  performQuery(q) {
    if (this.ongoingQueries.has(q.pid)) {
      return this.ongoingQueries.get(q.pid);
    }

    const promise = this.mod.action('performQuery', q);
    this.ongoingQueries.set(q.pid, promise);

    promise.then(data => Promise.resolve(data))
    .catch()
    .then(() => {
      this.ongoingQueries.delete(q.pid);
    });
    return promise;
  }


}
