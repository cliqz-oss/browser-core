import View from './view';
import { beforeIframeShown, onScroll } from './sites-specific';
import {
  tryToFindCoupon,
  injectCode,
  retryFunctionSeveralTimes,
} from './utils';
import { throttle } from '../../core/decorators';

export default class Observer {
  constructor({ window, onmessage, onaction, config, payload }) {
    this.onaction = onaction;
    this.onmessage = onmessage;
    this.window = window;
    this.payload = payload;

    this.view = new View({ onaction, window, config });
    this.config = config;

    this._onvisibilitychange = this._onvisibilitychange.bind(this);
    this._onscroll = throttle(window, this._onscroll.bind(this), 200);
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
      'offers-checkout': 'cliqz-offers-checkout',
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
  _send({ hideTooltip = false } = {}, payload = this.payload) {
    if (hideTooltip) {
      // assert payload.isPair = true
      this.view.sendToIframe(payload.popup);
    } else {
      const newPayload = payload.isPair ? payload.tooltip : payload;
      this.view.sendToIframe(newPayload);
      this.view.makeVisible();
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
        show: (dimensions) => {
          this.view.resize(dimensions);
          beforeIframeShown(this.window);
        },
      },
      'offers-reminder': {
        changePositionWithAnimation: this.view.changePositionWithAnimation.bind(this.view),
        changePosition: this.view.changePosition.bind(this.view),
        resize: this.view.resize.bind(this.view),
        getEmptyFrameAndData: this._send.bind(this),
      },
      'offers-checkout': {
        resize: this.view.resize.bind(this.view),
        injectCode: (payload = {}) => injectCode(window, payload),
        newView: (payload = {}) => {
          const products = this.config.products || {};
          if (!products.chip) { return undefined; } // only for chip guys
          const { restyle, view, timeout = 0 } = payload;
          const next = () => {
            if (restyle) { this.view.restyle(restyle); }
            this._send({}, { ...this.payload, view });
          };
          return timeout ? setTimeout(next, timeout) : next();
        },
        getEmptyFrameAndData: async (payload) => {
          if (this.payload.view !== 'checkout') { return this._send(payload); }
          const config = this.payload.back;
          const { ok, payload: newPayload } = this.payload.view === 'checkout'
            ? await retryFunctionSeveralTimes(window, () => tryToFindCoupon(window, config))
            : { ok: true, payload: {} };
          if (!ok) { return undefined; } // not ours coupon already was injected
          if (newPayload.canInject === false) { this._logInjectCouponFailed(); }
          return this._send(payload, { ...this.payload, ...newPayload });
        },
      },
    };
    const noop = () => {};
    if (!mapper[this.config.type]) { return; }
    (mapper[this.config.type][this._isBrowserPanel() ? handler : action] || noop)(data);
  }

  _logInjectCouponFailed() {
    this.onaction({
      action: 'log',
      data: {
        action: 'coupon_autofill_field_failed',
        back: this.payload.back,
      }
    });
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
    if (node) {
      onScroll(this.window, this.window.pageYOffset);
    }
  }

  _isBrowserPanel() { return this.config.type === 'browser-panel'; }
}
