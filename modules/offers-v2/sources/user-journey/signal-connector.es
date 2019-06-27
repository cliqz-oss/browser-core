import getDexie from '../../platform/lib/dexie';
import logger from '../common/offers_v2_logger';
import actions from '../offers/actions-defs';

/**
 * Several responsibilities at once:
 *
 * - persistent storage of journeys, but also
 * - a bit of logic to decide if a journey should be stored and then get it.
 *
 * @class JourneySignals
 */
export default class JourneySignals {
  constructor(collector) {
    this.collector = collector;
    this.signals = [];
    this.db = null;
  }

  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('offers-journey');
    this.db.version(1).stores({ signals: '++id' });
    await this.db;
  }

  async destroy() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async _addSignal(signal) {
    if (!this.db) {
      logger.warn('JourneySignals::addSignal: no database');
      return;
    }
    await this.db.signals
      .add(signal)
      .catch(err => logger.warn(`JourneySignals::addSignal error: ${err}`));
  }

  /**
   * Listen to the signals for the backend. As soon as an important user
   * action happens (for example, a click on an offer), get and store the
   * user journey. Called from `SignalsHandler`.
   *
   * @param {string} signalId
   * @returns {Promise<void>}
   */
  async reinterpretCampaignSignalAsync(signalId) {
    let sigType = '';
    //
    // Add signals from monitors as features
    //
    switch (signalId) { // eslint-disable-line default-case
      case actions.AID_OFFER_CALL_TO_ACTION:
        sigType = sigType || 'click'; // fallthrough
      case actions.AID_SUCCESS:
        sigType = sigType || 'purchase'; // fallthrough
      case actions.AID_LANDING:
      case actions.AID_PAGE_IMP:
      case actions.AID_PAYMENT:
      case actions.AID_CART:
        this.collector.addFeature({ feature: signalId });
    }
    //
    // Snapshot the journey
    //
    if (!sigType) {
      return;
    }
    await this._addSignal({
      type: sigType,
      journey: this.collector.getJourney()
    });
  }

  /**
   * Get the collected signals and clear the storage.
   *
   * @returns {Promise<[]>}
   */
  async moveSignals() {
    if (!this.db) {
      logger.warn('JourneySignals::moveSignals: no database');
      return [];
    }
    try {
      const signals = await this.db.signals.toArray();
      signals.forEach(sig => delete sig.id); // eslint-disable-line no-param-reassign
      await this.db.signals.clear();
      return signals;
    } catch (err) {
      logger.warn(`JourneySignals::moveSignals error: ${err}`);
      return [];
    }
  }
}
