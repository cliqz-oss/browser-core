import Observer from './observer';

export default class Handler {
  constructor({
    window,
  }) {
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

  showBanner({ config, onaction, payload }) {
    if (this.observer) { return; }
    this.config = config;
    this.onaction = onaction;
    this.payload = payload;
    this.observer = new Observer({
      onmessage: this.onmessage,
      onaction: this.onaction,
      window: this.window,
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
    const isBrowserPanel = this.config.type === 'browser-panel';
    if (!data || !(isBrowserPanel ? handler : action)) { return; }

    const mapper = {
      'offers-cc': {
        openURL: this._closePopupIf.bind(this),
        getEmptyFrameAndData: this._closeBoxIf.bind(this),
        hideBanner: this.removeBanner,
      },
      'browser-panel': {
        offersIFrameHandler: this._closePanelIf.bind(this),
      },
      'offers-reminder': {
        hideBanner: this.removeBanner,
      },
      'offers-checkout': {
        /* eslint-disable no-confusing-arrow */
        hideBanner: ({ timeout = 0 }) =>
          timeout ? setTimeout(this.removeBanner, timeout) : this.removeBanner(),
        /* eslint-enable no-confusing-arrow */
      },
    };
    const noop = () => {};
    if (!mapper[this.config.type]) { return; }
    (mapper[this.config.type][isBrowserPanel ? handler : action] || noop)(data);
  }
}
