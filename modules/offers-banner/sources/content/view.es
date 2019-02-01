import { afterIframeRemoved, beforeIframeShown } from './sites-specific';
import { createElement } from './utils';
import * as styles from './styles/index';

const WAIT_BEFORE_SHOWING = 500;
const DEBUG = false;
const SMALL_SCREEN_HEIGHT = 725;

export default class View {
  constructor({ onaction, window, config }) {
    this.isRewardBox = config.type === 'offers-cc';
    this.window = window;
    this.onaction = onaction;
    this.iframe = null;
    this.wrapper = null;
    this.config = config;
  }

  unload() {
    if (!this.isRewardBox) { afterIframeRemoved(this.window); }
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
      if (!this.isRewardBox) { beforeIframeShown(this.window); }
      this.wrapper.style.opacity = 1;
      this.iframe.style.opacity = 1;
      if (!this.isRewardBox) {
        this.onaction({ handler: 'offerShown', data: {} });
        this.onaction({ handler: 'offersFirstAppearance', data: {} });
      }
    }, this.config.waitBeforeShowing || WAIT_BEFORE_SHOWING);
  }

  resize({ width, height }) {
    this.iframe.style.height = `${height}px`;
    this.iframe.style.width = `${width}px`;
  }

  sendToIframe(payload) {
    const isSmallScreen = this.window.innerHeight < SMALL_SCREEN_HEIGHT;
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: this.isRewardBox ? 'cliqz-offers-cc' : 'cqz-browser-panel-re',
      origin: 'window',
      message: {
        action: this.isRewardBox ? 'pushData' : 'render_template',
        data: { ...payload, isSmallScreen },
      }
    }), '*');
  }

  render(bannerId) {
    const wrapper = createElement(this.window, { tag: 'div' });
    const iframe = createElement(this.window, { tag: 'iframe' });
    Object.assign(wrapper.style, styles.wrapper(this.isRewardBox));
    Object.assign(iframe.style, styles.banner(this.isRewardBox, this.config));

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
