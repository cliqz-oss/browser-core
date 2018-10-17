import { afterIframeRemoved } from './sites-specific';

export default class Handler {
  constructor({ window, iframe, wrapper, onAction }) {
    this.window = window;
    this.iframe = iframe;
    this.wrapper = wrapper;
    this.onAction = onAction;
  }

  init() {
    this.iframe.addEventListener('load', () => {
      if (!this.iframe.contentWindow) { return; }
      this.iframe.contentWindow.addEventListener('message', this._onMessage.bind(this), true);
    });
  }

  unload() {
    this.iframe = null;
    this.window = null;
    this.wrapper = null;
    this.onAction = null;
  }

  removeFromWindow() {
    this.iframe.remove();
    this.wrapper.remove();
    afterIframeRemoved(this.window);
    this.unload();
  }

  sendToIframe(payload) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cqz-browser-panel-re',
      origin: 'window',
      message: {
        action: 'render_template',
        data: payload,
      }
    }), '*');
  }

  _closeIfShould({ element_id: action }) {
    if (action === 'offer_closed') {
      this.removeFromWindow();
    }
  }

  _onMessage({ data } = {}) {
    if (!data) { return; }
    const { target, origin, message = {} } = JSON.parse(data);
    if (target !== 'cqz-browser-panel-re' || origin !== 'iframe') {
      return;
    }
    this.onAction(message);
    this._dispatcher(message);
  }

  _dispatcher({ data, handler } = {}) {
    if (!data || !handler) { return; }
    const mapper = {
      offersIFrameHandler: payload => this._closeIfShould(payload),
      openUrlHandler: ({ url } = {}) => window.open(url),
    };
    const noop = () => {};
    (mapper[handler] || noop)(data);
  }
}
