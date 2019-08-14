import { afterIframeRemoved, beforeIframeShown } from './sites-specific';
import { createElement } from './utils';
import * as styles from './styles/index';

const WAIT_BEFORE_SHOWING = 50;
const DEBUG = false;

export default class View {
  constructor({ onaction, window, config }) {
    this.window = window;
    this.onaction = onaction;
    this.iframe = null;
    this.wrapper = null;
    this.config = config;
  }

  unload() {
    if (this.config.type === 'browser-panel') { afterIframeRemoved(this.window); }
    if (this.shadowRoot) { this.shadowRoot.remove(); }
    this.iframe.remove();
    this.wrapper.remove();
    this.iframe = null;
    this.window = null;
    this.onaction = null;
    this.config = null;
  }

  makeVisible() {
    setTimeout(() => {
      const isBrowserPanel = this.config.type === 'browser-panel';
      if (isBrowserPanel) { beforeIframeShown(this.window); }
      this.wrapper.style.opacity = 1;
      this.iframe.style.opacity = 1;
      if (isBrowserPanel) {
        this.onaction({ handler: 'offerShown', data: {} });
        this.onaction({ handler: 'offersFirstAppearance', data: {} });
      }
      styles.animate(this.config.type, this.wrapper, this.config.styles);
    }, this.config.waitBeforeShowing || WAIT_BEFORE_SHOWING);
  }

  resize({ width, height }) {
    this.iframe.style.height = `${height}px`;
    this.iframe.style.width = `${width}px`;
  }

  changePositionWithAnimation({ deltaRight = 0, duration }) {
    const right = Number((this.wrapper.style.right || '0').replace(/\D/g, ''));
    const animationsOptions = { animation: true, duration, first: right, last: right + deltaRight };
    styles.animate(this.config.type, this.wrapper, animationsOptions);
  }

  changePosition({ deltaRight = 0 }) {
    const right = Number((this.wrapper.style.right || '0').replace(/\D/g, ''));
    this.wrapper.style.right = `${right + deltaRight}px`;
  }

  sendToIframe(payload) {
    const mapper = {
      'offers-cc': ['cliqz-offers-cc', 'pushData'],
      'browser-panel': ['cqz-browser-panel-re', 'render_template'],
      'offers-reminder': ['cliqz-offers-reminder', 'pushData'],
    };
    const [target, action] = mapper[this.config.type] || ['cliqz-offers-cc', 'pushData'];
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target,
      origin: 'window',
      message: { action, data: payload },
    }), '*');
  }

  render(bannerId) {
    if (this.window.document.getElementById(bannerId)) { return; }

    const wrapper = createElement(this.window, { tag: 'div' });
    const iframe = createElement(this.window, { tag: 'iframe' });
    Object.assign(wrapper.style, styles.wrapper(this.config.type, this.config.styles));
    Object.assign(iframe.style, styles.banner(this.config.type, this.config.styles));

    iframe.frameBorder = 0;
    wrapper.appendChild(iframe);
    iframe.src = this.config.url;

    const head = this.window.document.head;
    const isShadow = head.createShadowRoot || head.attachShadow;
    let shadowRoot = null;
    if (isShadow) {
      shadowRoot = createElement(this.window, { tag: 'span', id: bannerId });
      const shadow = shadowRoot.attachShadow({ mode: DEBUG ? 'open' : 'closed' });
      shadow.appendChild(wrapper);
      this.window.document.body.appendChild(shadowRoot);
    } else {
      wrapper.setAttribute('id', bannerId);
      this.window.document.body.appendChild(wrapper);
    }

    this.iframe = iframe;
    this.wrapper = wrapper;
    this.shadowRoot = shadowRoot;
  }
}
