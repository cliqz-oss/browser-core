import { timestampMS } from '../utils';

const SAME_STEP_TIMESTAMP_DELTA_MS = 100;
const JOURNEY_SIZE = 16;

/**
 * Store recent user behavior and convert it to a journey.
 *
 * @class JourneyCollector
 */
export default class JourneyCollector {
  constructor() {
    this.journey = [];
    this.lastTs = 0;
  }

  /**
   * Journey is a list of steps, a step is a set of features.
   *
   * @method getJourney
   * @returns {string[][]}
   */
  getJourney() {
    return this.journey;
  }

  /**
   * Features are joined into one step if they happen simultaneously
   * up to the time delta `SAME_STEP_TIMESTAMP_DELTA_MS`.
   *
   * @method addEvent
   * @param {number} ts -- timestamp of `feature` in milliseconds.
   * @param {string} feature
   */
  addEvent({ ts = timestampMS(), feature }) {
    if ((!this.journey.length)
      || (Math.abs(this.lastTs - ts) > SAME_STEP_TIMESTAMP_DELTA_MS)
    ) {
      this.journey.push([feature]);
    } else {
      const commonStep = this.journey[this.journey.length - 1];
      commonStep.push(feature);
    }
    this.lastTs = ts;
    if (this.journey.length > JOURNEY_SIZE) {
      this.journey.shift();
    }
  }
}
