import MatchingEngine from './matching';
import Condition from './condition';

export default class GreenAdsManager {
  constructor() {
    this.conditions = new Map();

    // --------------------------------------------------------------------- //
    // Matching Engine
    // --------------------------------------------------------------------- //
    // Convert a stream of 'visits' and 'query' events to a stream of atomic
    // conditions met. This stream is in turned used to detect matching
    // campaigns.
    this.engine = new MatchingEngine();
  }

  init() {
    return this.engine.init();
  }

  unload() {
    this.engine.unload();
  }

  destroy() {
    return this.engine.destroy();
  }

  getCondition(raw) {
    let condition = this.conditions.get(raw);
    if (condition !== undefined) {
      return Promise.resolve(condition);
    }

    condition = new Condition(JSON.parse(raw).triggers);
    this.conditions.set(raw, condition);
    return this.engine.addCondition(condition).then(() => condition);
  }

  getNewMatches(ts) {
    return this.engine.getNewMatches(ts);
  }
}
