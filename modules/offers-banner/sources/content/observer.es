import View from './view';

export default class Observer {
  constructor({ window, onmessage, onaction, config, onremove, payload }) {
    this.onaction = onaction;
    this.onmessage = onmessage;
    this.window = window;
    this.onremove = onremove;
    this.payload = payload;

    this.view = new View({ onaction, window, config });
    this._initialPayloadWasSent = false;
    this.config = config;

    this._onvisibilitychange = this._onvisibilitychange.bind(this);
    this._onscroll = this._onscroll.bind(this);
    this._onmessage = this._onmessage.bind(this);

    this.init();
  }

  init() {
    this.window.addEventListener('message', this._onmessage, true);
    this.window.document.addEventListener('visibilitychange', this._onvisibilitychange);
    this.window.document.addEventListener('scroll', this._onscroll);
    this.view.render(this._getBannerId());
  }

  unload() {
    this.window.removeEventListener('message', this._onmessage, true);
    this.window.document.removeEventListener('visibilitychange', this._onvisibilitychange);
    this.window.document.removeEventListener('scroll', this._onscroll);

    this.window = null;
    this.onaction = null;
    this.onmessage = null;
    this.onremove = null;
    this.config = null;

    this.view.unload();
    this.view = null;
  }

  _onmessage({ data, origin } = {}) {
    if (!data || !this.config.url.startsWith(origin)) { return; }
    const { target, origin: targetOrigin, message = {} } = JSON.parse(data);
    const mapper = {
      'offers-cc': 'cliqz-offers-cc',
      'browser-panel': 'cqz-browser-panel-re',
      'offers-reminder': 'cliqz-offers-reminder',
    };
    const desirableTarget = mapper[this.config.type] || 'cliqz-offers-cc';
    if (target !== desirableTarget || targetOrigin !== 'iframe') {
      return;
    }
    this._dispatcher(message);
    this.onmessage(message);
  }

  /*
    payload -- can be object or pair of objects [payload.isPair = true]
    Payload will be pair when data for realEstate are strongly connected
    e.g `tooltip` and `popup` -> user clicks on `tooltip` and gets `popup`
  */
  _send({ hideTooltip = false }) {
    if (hideTooltip) {
      // assert payload.isPair = true
      this.view.sendToIframe(this.payload.popup);
    }
    if (!this._initialPayloadWasSent) {
      const payload = this.payload.isPair ? this.payload.tooltip : this.payload;
      this.view.sendToIframe(payload);
      this.view.makeVisible();
      this._initialPayloadWasSent = true;
    }
  }

  _dispatcher({ data, handler, action } = {}) {
    if (!data || !(this._isBrowserPanel() ? handler : action)) { return; }
    const mapper = {
      'offers-cc': {
        resize: this.view.resize.bind(this.view),
        getEmptyFrameAndData: this._send.bind(this),
      },
      'browser-panel': {
        offersIFrameHandler: this._send.bind(this),
      },
      'offers-reminder': {
        changePositionWithAnimation: this.view.changePositionWithAnimation.bind(this.view),
        changePosition: this.view.changePosition.bind(this.view),
        resize: this.view.resize.bind(this.view),
        getEmptyFrameAndData: this._send.bind(this),
      }
    };
    const noop = () => {};
    if (!mapper[this.config.type]) { return; }
    (mapper[this.config.type][this._isBrowserPanel() ? handler : action] || noop)(data);
  }

  _getBannerId() {
    const products = this.config.products || {};
    const prefix = ['freundin', 'chip', 'cliqz'].find(product => products[product]);
    return `${prefix || 'myoffrz'}-offers-banner`;
  }

  _onvisibilitychange() {
    if (!this._isBrowserPanel()) { return; }
    const node = this.window.document.getElementById(this._getBannerId());
    const isVisible = this.window.document.visibilityState === 'visible';
    if (node && isVisible) {
      this.onaction({ handler: 'offerShown', data: {} });
    }
  }

  _onscroll() {
    if (!this._isBrowserPanel()) { return; }
    const node = this.window.document.getElementById(this._getBannerId());
    const scrollY = this.window.pageYOffset;
    const partOfBannersHeight = 100; // 70 percents of banner's height
    if (node && scrollY > partOfBannersHeight) {
      this.onremove();
    }
  }

  _isBrowserPanel() { return this.config.type === 'browser-panel'; }
}
