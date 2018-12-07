/**
 * This module (intent) will be the connection / bridge between the trigger engine
 * and categories (used to detect an intent) and the offers module in charge
 * of handling them.
 * We will here only hold all the activated intents and notify to the listeners
 * whenever there is a new intent.
 */

import Intent from './intent';
import logger from '../common/offers_v2_logger';
import prefs from '../../core/prefs';
import { buildCachedMap } from '../common/cached-map-ext';

const INTENT_DB_DOC_ID = 'cliqz-offers-intent-db';


/**
 * Will hold and store the active intents (persistently)
 */
export default class IntentHandler {
  constructor() {
    this.activeIntents = buildCachedMap(INTENT_DB_DOC_ID, !prefs.get('offersDevFlag', false));
    this.callbacks = new Map();
  }

  init() {
    return this.activeIntents.init().then(() => {
      logger.debug('We have the following active intents', [...this.activeIntents.keys()]);
    });
  }

  registerCallback(cb) {
    this.callbacks.set(cb, cb);
  }

  unregisterCallback(cb) {
    this.callbacks.delete(cb);
  }

  activateIntent(intent) {
    if (this.isIntentActive(intent)) {
      return;
    }
    this.activeIntents.set(intent.getName(), intent.serialize());
    this._notifyListeners('intent-active', intent);
  }

  getActiveIntents() {
    this._removeInactiveIntents();
    return this.activeIntents.keys().map(iName =>
      Intent.deserialize(this.activeIntents.get(iName))) || [];
  }

  isIntentActiveByName(intentName) {
    return this.activeIntents.has(intentName)
           && Intent.deserialize(this.activeIntents.get(intentName)).isActive();
  }

  isIntentActive(intent) {
    return this.isIntentActiveByName(intent.getName());
  }

  getActiveIntent(intentName) {
    return this.isIntentActiveByName(intentName)
      ? Intent.deserialize(this.activeIntents.get(intentName))
      : null;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //                        PRIVATE METHODS
  // ///////////////////////////////////////////////////////////////////////////

  _notifyListeners(evt, data) {
    this.callbacks.forEach(cb => cb(evt, data));
  }

  _removeInactiveIntents() {
    this.activeIntents.keys().forEach((intentName) => {
      const intent = Intent.deserialize(this.activeIntents.get(intentName));
      if (!intent.isActive()) {
        this.activeIntents.delete(intentName);
      }
    });
  }
}
