import moment from '../platform/lib/moment';
import LRU from '../core/LRU';
import SimpleDB from '../core/persistence/simple-db';
import logger from './common/offers_v2_logger';

const STORAGE_ID = 'offers-shop-reminder';
const MAX_SHOPS = 24;
const ALLOWED_ACTIONS = ['open', 'close', 'minimize'];
const REMINDER_VALID_DAYS = 1;
const INTENT_ACTIVE_MINUTES = 45;
const ACTION_BONUS_MINUTES = 15;

class Model {
  state = 'new'; // new | open | close | minimize

  updated = Date.now();

  actionsTS = { };

  offerId = '';

  description = '';

  constructor(other = {}) { // copy-constructor
    Object.keys(other).forEach((key) => {
      if (other[key] !== undefined) { this[key] = other[key]; }
    });
    if (other.actionsTS !== undefined) { this.actionsTS = { ...other.actionsTS }; }
  }
}

export default class ShopReminder {
  constructor({ store, db }) {
    this.store = store || new LRU(MAX_SHOPS);
    this.db = db ? new SimpleDB(db, logger) : null;
  }

  async init() {
    try {
      const data = await this.db.get(STORAGE_ID);
      const store = JSON.parse((data || {}).store || '{}');
      Object.keys(store).forEach(key => this.store.set(key, store[key]));
    } catch (e) {
      logger.warn('ShopReminder: init failed, fallback to in-memory store, e: ', e);
      this.store = new LRU(MAX_SHOPS);
    }
  }

  unload() {
    this.db = null;
    this.store = null;
  }

  add(domain, offerId, description) {
    this._save(domain, new Model({ offerId, description }));
  }

  receive(domain, action) {
    if (!ALLOWED_ACTIONS.includes(action)) { return; }
    const model = this.store.get(domain);
    if (!model) { return; }
    const newActionsTS = { ...model.actionsTS, [action]: Date.now() };
    const newUpdated = this._calcUpdated(model);
    const newModel = new Model({
      ...model,
      state: action,
      updated: newUpdated,
      actionsTS: newActionsTS,
    });
    this._save(domain, newModel);
  }

  /*
    model.updated can be in any positions beetween this four marks:
      1970 | REMINDER_VALID_DAYS ago | INTENT_ACTIVE_MINUTES ago | now

    model.actionsTS.close should be in any positions beetween this three marks:
      REMINDER_VALID_DAYS ago | INTENT_ACTIVE_MINUTES ago | now
  */
  notification(domain) {
    const model = this.store.get(domain);
    if (!model) { return [false, null]; }
    if (model.updated < moment().subtract(REMINDER_VALID_DAYS, 'days').valueOf()) {
      return [false, null];
    }
    if (model.state === 'close'
      && (model.actionsTS.close > moment().subtract(INTENT_ACTIVE_MINUTES, 'minutes').valueOf())) {
      return [false, null];
    }
    const state = model.state;
    const newState = model.state === 'close' ? 'minimize' : model.state;
    if (state === newState) { return [true, new Model(model)]; }
    model.state = newState;
    this._save(domain, model);
    return [true, new Model(model)];
  }

  async _save(domain, model) {
    this.store.set(domain, model);
    // assert this.store.toMap is defined
    try {
      const obj = {};
      this.store.toMap().forEach((value, key) => { obj[key] = value; });
      await this.db.upsert(STORAGE_ID, { store: JSON.stringify(obj) });
    } catch (e) {
      logger.warn('ShopReminder: db _save failed, fallback to in-memory store, e: ', e);
    }
  }

  _calcUpdated(model = {}) {
    const distance = model.updated - moment().subtract(REMINDER_VALID_DAYS, 'days').valueOf();
    const almostValid = distance > 0 && distance < ACTION_BONUS_MINUTES * 60 * 1000;
    return almostValid ? model.updated + ACTION_BONUS_MINUTES * 60 * 1000 : model.updated;
  }
}
