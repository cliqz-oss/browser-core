import { chrome } from '../platform/globals';
import { getResourceUrl } from '../core/platform';
import * as transport from './transport/index';

export default class Popup {
  constructor({ getOffers, onPopupOpen }) {
    this.getOffers = getOffers || (() => Promise.resolve({}));
    this.onPopupOpen = onPopupOpen || (() => {});

    this.onMessage = this.onMessage.bind(this);
  }

  init() { chrome.runtime.onMessage.addListener(this.onMessage); }

  unload() {
    chrome.runtime.onMessage.removeListener(this.onMessage);
    this.getOffers = null;
    this.onPopupOpen = null;
  }

  onMessage(msg) {
    const { message: { action, data } = {}, target } = msg;
    if (target !== 'cliqz-offers-cc') { return; }
    this._dispatcher(action, data);
    const offerId = null; // transport layer will get offerId from the data
    const autoTrigger = false;
    transport.dispatcher('offers-cc', offerId, { action, data }, autoTrigger);
  }

  _sendToPopup(data = {}) {
    const popup = this._getPopup();
    if (!popup) { return; }

    popup.postMessage(JSON.stringify({
      target: 'cliqz-offers-cc',
      origin: 'window',
      message: {
        data,
        action: 'pushData',
      }
    }), '*');
  }

  _getPopup() {
    const href = getResourceUrl('offers-cc/index.html?popup');
    return chrome.extension.getViews().find(view => view.location.href === href);
  }

  _sendShowSignal(payload) {
    const { data: { vouchers = [] } = {} } = payload;
    const action = 'sendTelemetry';
    const data = { action: 'show', offersCount: vouchers.length };
    transport.dispatcher('offers-cc', null, { action, data }, false);
  }

  _sendCloseSignalIfNeeded(action, popup) {
    if (action === 'hideBanner' && popup) {
      const data = { target: 'close' };
      transport.dispatcher('offers-cc', null, { action: 'sendTelemetry', data }, false);
    }
  }

  _dispatcher = async (action, { noVouchersLeft = false } = {}) => {
    if (!['getEmptyFrameAndData', 'hideBanner'].includes(action)) { return; }
    if (noVouchersLeft || action === 'hideBanner') {
      const popup = this._getPopup();
      this._sendCloseSignalIfNeeded(action, popup);
      if (popup) { popup.close(); }
    } else {
      this.onPopupOpen();
      const payload = await this.getOffers();
      this._sendToPopup(payload.data);
      this._sendShowSignal(payload);
    }
  }
}
