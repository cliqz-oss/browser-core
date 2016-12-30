import utils from '../utils';
import maybe from '../helpers/maybe';

export default class {
  constructor(window, url, id, autohide = true, actions = {}) {
    this.window = window;
    this.document = this.window.document;
    this.url = url;
    this.id = id;
    this.autohide = autohide;
    this.actions = actions;
    this.shouldBeOpen = false;

    this.onShowing = this.onShowing.bind(this);
    this.onHiding = this.onHiding.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMessage = this.onMessage.bind(this);
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

    iframe.setAttribute('type', 'content');
    iframe.setAttribute('src', this.url);
    iframe.addEventListener('load', onPopupReady.bind(this), true);

    this.iframe = iframe;
  }

  sendMessage(message) {
    const json = JSON.stringify(message);
    this.iframe.contentWindow.postMessage(json, '*');
  }

  onMessage(event) {
    const data = JSON.parse(event.data);
    if (data.target === 'cliqz-control-center' &&
       data.origin === 'iframe') {
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

  onShowing() {
    this.createIframe();
    this.panel.querySelector('vbox').appendChild(this.iframe);

    // TODO: need a better way to attach those events
    utils.setTimeout(() => {
      maybe(this, 'wrapperPanel').then(panel => {
        panel.addEventListener('mouseover', this.onMouseOver);
      });
      maybe(this, 'wrapperPanel').then(panel => {
        panel.addEventListener('mouseout', this.onMouseOut);
      });
    }, 200);
  }

  onHiding() {
    this.panel.querySelector('vbox').removeChild(this.iframe);

    maybe(this, 'wrapperPanel').then(panel => {
      panel.removeEventListener('mouseover', this.onMouseOver);
    });
    maybe(this, 'wrapperPanel').then(panel => {
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

  hide() {
    this.shouldBeOpen = false;
    utils.setTimeout(() => {
      if (!this.shouldBeOpen) {
        maybe(this, 'wrapperPanel').then(panel => panel.hidePopup());
      }
    }, 300);
  }

  destroyPanel() {
    delete this.panel;
  }

  wrapperPanel() {
    return this.document.querySelector(`[viewId=${this.id}]`);
  }

  panelUI() {
    return this.document.getElementById('PanelUI-multiView');
  }

  attach() {
    this.createPanel();
    maybe(this, 'panelUI').then(panelui => {
      panelui.appendChild(this.panel);
    });
  }

  detach() {
    const panelui = this.panelUI();
    if (panelui) {
      panelui.removeChild(this.panel);
      this.destroyPanel();
    }
  }
}
