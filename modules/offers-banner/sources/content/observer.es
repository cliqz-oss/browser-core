import View from './view';

const BANNER_ID = 'cliqz-offers-banner';
const AUTO_HIDE_TIMEOUT = 10 * 60 * 1000;

export default class Observer {
  constructor({ window, onmessage, onaction, config, onremove, payload }) {
    this.onaction = onaction;
    this.onmessage = onmessage;
    this.window = window;
    this.onremove = onremove;
    this.payload = payload;

    this.view = new View({ onaction, window, config });
    this._initialPayloadWasSent = false;
    this.isRewardBox = config.type === 'offers-cc';
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

    this.interval = this.window.setTimeout(() => {
      if (window.document.getElementById(BANNER_ID)) {
        this.onremove();
      }
    }, AUTO_HIDE_TIMEOUT);

    this.view.render(BANNER_ID);
  }

  unload() {
    this.window.removeEventListener('message', this._onmessage, true);
    this.window.document.removeEventListener('visibilitychange', this._onvisibilitychange);
    this.window.document.removeEventListener('scroll', this._onscroll);
    this.window.clearInterval(this.interval);

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
    const desirableTarget = this.isRewardBox ? 'cliqz-offers-cc' : 'cqz-browser-panel-re';
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
    if (!data || !(this.isRewardBox ? action : handler)) { return; }
    const mapper = this.isRewardBox
      ? {
        resize: this.view.resize.bind(this.view),
        getEmptyFrameAndData: this._send.bind(this),
      } : {
        offersIFrameHandler: this._send.bind(this),
      };
    const noop = () => {};
    (mapper[this.isRewardBox ? action : handler] || noop)(data);
  }

  _onvisibilitychange() {
    if (this.isRewardBox) { return; }
    const node = this.window.document.getElementById(BANNER_ID);
    const isVisible = this.window.document.visibilityState === 'visible';
    if (node && isVisible) {
      this.onaction({ handler: 'offerShown', data: {} });
    }
  }

  _onscroll() {
    if (this.isRewardBox) { return; }
    const node = this.window.document.getElementById(BANNER_ID);
    const scrollY = this.window.pageYOffset;
    const partOfBannersHeight = 100; // 70 percent of banner's height
    if (node && scrollY > partOfBannersHeight) {
      this.onremove();
    }
  }
}
