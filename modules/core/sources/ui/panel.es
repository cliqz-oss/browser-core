import utils from '../utils';
import maybe from '../helpers/maybe';
import console from '../../core/console';
import getContainer from '../../platform/ui/helpers';

export default class {
  constructor({
      window,
      url,
      id,
      type,
      autohide = true,
      actions = {},
      version = 0,
      onHidingCallback = null,
      onShowingCallback = null,
      defaultWidth = 0,
      defaultHeight = 0,
    } = {}) {
    this.window = window;
    this.document = this.window.document;
    this.url = url;
    this.id = id;
    this.autohide = autohide;
    this.actions = actions;
    this.shouldBeOpen = false;
    this.type = type;
    this.version = version;

    this.onShowing = this.onShowing.bind(this, onShowingCallback);
    this.onHiding = this.onHiding.bind(this, onHidingCallback);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMessage = this.onMessage.bind(this);

    this.defaultWidth = defaultWidth;
    this.defaultHeight = defaultHeight;
  }

  createPanel() {
    const panel = this.document.createElement('panelview');
    const vbox = this.document.createElement('vbox');

    panel.setAttribute('id', this.id);
    panel.setAttribute('flex', '1');
    panel.setAttribute('panelopen', 'true');
    panel.setAttribute('animate', 'true');
    panel.setAttribute('type', 'arrow');

    vbox.classList.add('panel-subview-body');
    panel.appendChild(vbox);

    panel.addEventListener('ViewShowing', this.onShowing);
    panel.addEventListener('ViewHiding', this.onHiding);

    this.panel = panel;
  }

  createIframe() {
    const iframe = this.document.createElement('iframe');

    function onPopupReady() {
      const body = iframe.contentDocument.body;
      const clientHeight = body.scrollHeight;
      const clientWidth = body.scrollWidth;

      iframe.style.height = `${clientHeight}px`;
      iframe.style.width = `${clientWidth}px`;

      iframe.contentWindow.addEventListener('message', this.onMessage);
    }

    iframe.addEventListener('load', onPopupReady.bind(this), true);
    iframe.setAttribute('type', 'content');
    iframe.setAttribute('src', this.url);

    this.iframe = iframe;
  }

  sendMessage(message) {
    try {
      const json = JSON.stringify(message);
      if (this.iframe && this.iframe.contentWindow) {
        this.iframe.contentWindow.postMessage(json, '*');
      }
    } catch (e) {
      console.error(e);
    }
  }

  onMessage(event) {
    const data = JSON.parse(event.data);
    if (data.target === 'cliqz-video-downloader' && data.origin === 'iframe') {
      const message = data.message;
      this.actions[message.action](message.data);
    }
  }

  onMouseOver() {
    this.shouldBeOpen = true;
  }

  onMouseOut() {
    if (this.autohide) {
      this.hide();
    }
  }

  onShowing(cb) {
    this.createIframe();
    this.panel.querySelector('vbox').appendChild(this.iframe);

    utils.telemetry({
      type: this.type,
      version: this.version,
      action: 'show',
    });
    this.startShowingAt = Date.now();

    // TODO: need a better way to attach those events
    utils.setTimeout(() => {
      maybe(this, 'wrapperPanel').then((panel) => {
        panel.addEventListener('mouseover', this.onMouseOver);
      });
      maybe(this, 'wrapperPanel').then((panel) => {
        panel.addEventListener('mouseout', this.onMouseOut);
      });
    }, 200);

    if (typeof cb === 'function') {
      cb();
    }

    this.resizePopup({
      width: this.defaultWidth,
      height: this.defaultHeight,
    });
  }

  onHiding(cb) {
    this.panel.querySelector('vbox').removeChild(this.iframe);
    this.shownDurationTime = Date.now() - this.startShowingAt;
    utils.telemetry({
      type: this.type,
      version: this.version,
      action: 'hide',
      show_duration: this.shownDurationTime,
    });

    if (typeof cb === 'function') {
      cb();
    }
    maybe(this, 'wrapperPanel').then((panel) => {
      panel.removeEventListener('mouseover', this.onMouseOver);
    });
    maybe(this, 'wrapperPanel').then((panel) => {
      panel.removeEventListener('mouseout', this.onMouseOut);
    });
  }

  open(button) {
    this.shouldBeOpen = true;
    this.window.PanelUI.showSubView(
      this.id,
      button,
      this.window.CustomizableUI.AREA_NAVBAR
    );
  }

  hide({ force = false } = {}) {
    this.shouldBeOpen = false;
    utils.setTimeout(() => {
      if (force || !this.shouldBeOpen) {
        maybe(this, 'wrapperPanel').then(panel => panel.hidePopup());
      }
    }, 300);
  }

  resizePopup({ width, height }) {
    this.iframe.style.width = `${width}px`;
    this.iframe.style.height = `${height}px`;
  }

  destroyPanel() {
    delete this.panel;
  }

  wrapperPanel() {
    return this.document.querySelector(`[viewId=${this.id}]`);
  }

  panelUI() {
    return getContainer(this.document);
  }

  attach() {
    this.createPanel();
    maybe(this, 'panelUI').then((panelui) => {
      panelui.appendChild(this.panel);
    });
  }

  detach() {
    const panelui = this.panel.parentElement;
    if (panelui) {
      panelui.removeChild(this.panel);
      this.destroyPanel();
    }
  }
}
