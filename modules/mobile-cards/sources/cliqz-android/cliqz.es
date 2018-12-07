/* global window */
import Spanan from 'spanan';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';

export default class Cliqz {
  constructor(actions = {}) {
    this.mobileCardsWrapper = createSpananForModule('mobile-cards');
    this.coreWrapper = createSpananForModule('core');
    this.searchWrapper = createSpananForModule('search');
    this.geolocationWrapper = createSpananForModule('geolocation');

    this.mobileCards = this.mobileCardsWrapper.createProxy();
    this.core = this.coreWrapper.createProxy();
    this.search = this.searchWrapper.createProxy();
    this.geolocation = this.geolocationWrapper.createProxy();

    this.api = new Spanan();
    this.actions = actions;
  }

  onMessage = (message) => {
    const msg = {
      uuid: message.requestId,
      response: message.response,
      action: message.action,
      args: message.args,
    };
    this.coreWrapper.handleMessage(msg);
    this.mobileCardsWrapper.handleMessage(msg);
    this.api.handleMessage(msg);
  };

  init() {
    this.api.export(this.actions);

    chrome.runtime.onMessage.addListener(this.onMessage);

    window.addEventListener('unload', () => {
      chrome.runtime.onMessage.removeListener(this.onMessage);
    });
  }
}
