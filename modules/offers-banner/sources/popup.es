import { chrome } from '../platform/globals';
import { isGhostery } from '../core/platform';
import events from '../core/events';
import * as transport from './transport/index';

export default class Popup {
  constructor({ getOffers, onPopupOpen, onGetImageAsDataurl }) {
    this.getOffers = getOffers || (() => Promise.resolve({}));
    this.onPopupOpen = onPopupOpen || (() => {});
    this.onGetImageAsDataurl = onGetImageAsDataurl || (() => {});

    this.onMessage = this.onMessage.bind(this);
  }

  init() { chrome.runtime.onMessage.addListener(this.onMessage); }

  unload() {
    chrome.runtime.onMessage.removeListener(this.onMessage);
    this.getOffers = null;
    this.onPopupOpen = null;
  }

  onMessage(msg, sender, sendResponse) {
    const { message: { action, data } = {}, target } = msg;
    if (target !== 'cliqz-offers-templates') { return undefined; }

    this._dispatcher(action, data, sendResponse);

    const offerId = null; // transport layer will get offerId from the data
    const autoTrigger = false;
    transport.dispatcher('offers-cc', offerId, { action, data }, autoTrigger);
    return true; // we have to return true, because of passing sendResponse to a function
  }

  _dispatcher = async (action, data, sendResponse) => {
    if (action === 'getEmptyFrameAndData') {
      this.onPopupOpen();
      const banner = isGhostery ? 'ghostery' : 'offers-cc';
      const payload = await this.getOffers(banner);
      sendResponse({ action: 'pushData', data: payload.data });
      events.pub('ui:click-on-reward-box-icon', {});
    } else if (action === 'getImageAsDataurl') {
      const back = await this.onGetImageAsDataurl(data);
      sendResponse(back);
    } else {
      sendResponse({});
    }
  }
}
