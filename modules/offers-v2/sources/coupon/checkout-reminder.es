import LRU from '../../core/LRU';
import Journey from './journey';

const CHECKOUT_JOURNEYS = Object.freeze([
  'close',
  'copy',
  'apply ok',
  'apply close',
  'apply fail close',
  'apply fail reason',
]);
const EXPIRED_JOURNEY = 20 * 60 * 1000;
const EXPIRED_FEEDBACK = 1 * 60 * 1000;
const MAX_CHECKOUTS = 8;

export default class CheckoutReminder {
  constructor(store) {
    this.store = store || new LRU(MAX_CHECKOUTS);
  }

  add({
    domain,
    offerId,
    paths = CHECKOUT_JOURNEYS,
    expired = EXPIRED_JOURNEY,
  } = {}) {
    const [journey] = this.store.get(domain) || [null, null];
    const newJourney = !journey || (Date.now() - journey.lastTs > expired)
      ? this._newJourney(paths)
      : this._updatedJourney(journey, Date.now());
    this.store.set(domain, [newJourney, offerId]);
  }

  receive(domain, ev) {
    const [journey] = this.store.get(domain) || [null, null];
    if (journey) { journey.receive(ev); }
  }

  notification(domain, isActiveCheckoutPage) {
    const [journey, offerId] = this.store.get(domain) || [null, null];
    if (!journey || journey.done) { return [false, null, null]; }
    const pathToView = {
      '': ['checkout', true], // beginning of the journey
      apply: ['feedback', false],
      'apply fail': ['reason', false],
    };
    const [view, shouldBeActive] = pathToView[journey.getBestPath()] || [null, null];
    if (view === null) { return [false, null, null]; }
    if (shouldBeActive && !isActiveCheckoutPage) { return [false, null, null]; }
    return this._stillValid(journey, view) ? [true, view, offerId] : [false, null, null];
  }

  _newJourney(paths) {
    const journey = new Journey();
    journey.init(paths);
    return journey;
  }

  _updatedJourney(journey, newLastTs) {
    const newJourney = new Journey(journey);
    newJourney.lastTs = newLastTs;
    return newJourney;
  }

  _stillValid(
    journey,
    view,
    expiredMapper = { checkout: EXPIRED_JOURNEY }
  ) {
    const expired = expiredMapper[view] || EXPIRED_FEEDBACK;
    return (Date.now() - journey.lastTs) <= expired;
  }
}
