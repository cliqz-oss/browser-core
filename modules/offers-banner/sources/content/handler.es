import Observer from './observer';

export default class Handler {
  constructor({
    window,
  }) {
    // will be set by client
    this.onaction = null;
    this.config = null;
    this.payload = null;

    this.window = window;
    this.observer = null;

    this.onmessage = this.onmessage.bind(this);
    this.removeBanner = this.removeBanner.bind(this);
  }

  unload() {
    this.onaction = null;
    this.window = null;
    this.config = null;
    this.payload = null;

    if (this.observer) { this.observer.unload(); }
    this.observer = null;
  }

  onmessage = (message) => {
    this.onaction(message);
    this._dispatcher(message);
  }

  toggleBanner() {
    if (this.observer) {
      this.removeBanner();
    } else {
      this.showBanner();
    }
  }

  showBanner() {
    if (this.observer) { return; }
    this.observer = new Observer({
      onmessage: this.onmessage,
      onaction: this.onaction,
      window: this.window,
      onremove: this.removeBanner,
      config: this.config,
      payload: this.payload,
    });
  }

  removeBanner() {
    if (!this.observer) { return; }
    this.observer.unload();
    this.observer = null;
  }

  _closePopupIf({ closePopup = false }) {
    if (closePopup) { this.removeBanner(); }
  }

  _closeBoxIf({ noVouchersLeft = false }) {
    if (noVouchersLeft) { this.removeBanner(); }
  }

  _closePanelIf({ element_id: action }) {
    if (action === 'offer_closed') { this.removeBanner(); }
  }

  _dispatcher({ data, handler, action } = {}) {
    const isRewardBox = this.config.type === 'offers-cc';
    if (!data || !(isRewardBox ? action : handler)) { return; }
    const mapper = isRewardBox
      ? {
        openURL: this._closePopupIf.bind(this),
        getEmptyFrameAndData: this._closeBoxIf.bind(this),
        hideBanner: this.removeBanner,
      } : {
        offersIFrameHandler: this._closePanelIf.bind(this),
      };
    const noop = () => {};
    (mapper[isRewardBox ? action : handler] || noop)(data);
  }
}
