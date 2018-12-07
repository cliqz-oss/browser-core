import { afterIframeRemoved } from './sites-specific';

export default class Handler {
  constructor({
    window,
    iframe,
    wrapper,
    onAction,
    isRewardBox,
    onHideTooltipData,
    config,
    initialPayload,
    onIframeLoad,
  }) {
    this.window = window;
    this.iframe = iframe;
    this.wrapper = wrapper;
    this.onAction = onAction;
    this.isRewardBox = isRewardBox;
    this.onHideTooltipData = onHideTooltipData;
    this.config = config;
    this.initialPayload = initialPayload;
    this.onIframeLoad = onIframeLoad;
  }

  init() {
    this.window.addEventListener('message', this._onMessage, true);
  }

  unload() {
    if (this.window) {
      this.window.removeEventListener('message', this._onMessage, true);
    }
    this.iframe = null;
    this.window = null;
    this.wrapper = null;
    this.onAction = null;
    this.onHideTooltipData = null;
    this.initialPayload = null;
    this.onIframeLoad = null;
  }

  removeFromWindow() {
    this.iframe.remove();
    this.wrapper.remove();
    if (!this.isRewardBox) { afterIframeRemoved(this.window); }
    this.unload();
  }

  sendToIframe(payload) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: this.isRewardBox ? 'cliqz-offers-cc' : 'cqz-browser-panel-re',
      origin: 'window',
      message: {
        action: this.isRewardBox ? 'pushData' : 'render_template',
        data: payload,
      }
    }), '*');
  }

  _sendOrclosePanel({ element_id: action }) {
    if (action === 'offer_closed') {
      this.removeFromWindow();
    }
    if (this.initialPayload) {
      this.onIframeLoad();
      this.sendToIframe(this.initialPayload);
      this.initialPayload = null;
    }
  }

  _onMessage = ({ data, origin } = {}) => {
    if (!data || !this.config.url.startsWith(origin)) { return; }
    const { target, origin: targetOrigin, message = {} } = JSON.parse(data);
    const desirableTarget = this.isRewardBox ? 'cliqz-offers-cc' : 'cqz-browser-panel-re';
    if (target !== desirableTarget || targetOrigin !== 'iframe') {
      return;
    }
    this.onAction(message);
    this._dispatcher(message);
  }

  _resize({ width, height }) {
    this.iframe.style.height = `${height}px`;
    this.iframe.style.width = `${width}px`;
  }

  _closePopupIfShould({ closePopup = false }) {
    if (closePopup) { this.removeFromWindow(); }
  }

  _sendOrClose({ hideTooltip = false, noVouchersLeft = false }) {
    if (hideTooltip) { this.sendToIframe(this.onHideTooltipData); }
    if (noVouchersLeft) { this.removeFromWindow(); }
    if (this.initialPayload) {
      this.onIframeLoad();
      this.sendToIframe(this.initialPayload);
      this.initialPayload = null;
    }
  }

  _dispatcher({ data, handler, action } = {}) {
    if (!data || !(this.isRewardBox ? action : handler)) { return; }
    const mapper = this.isRewardBox
      ? {
        openURL: this._closePopupIfShould.bind(this),
        resize: this._resize.bind(this),
        getEmptyFrameAndData: this._sendOrClose.bind(this),
        hideBanner: this.removeFromWindow.bind(this),
      } : {
        offersIFrameHandler: this._sendOrclosePanel.bind(this),
      };
    const noop = () => {};
    (mapper[this.isRewardBox ? action : handler] || noop)(data);
  }
}
