import FreshtabDropdownManager from './freshtab';
import Defer from '../../core/helpers/defer';
import config from '../../core/config';

export default class OverlayDropdownManager extends FreshtabDropdownManager {
  _trigger = '';

  OFF_STYLES = `
    display: none !important;
  `;

  ON_STYLES = `
    display: block !important;
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 9007199254740991 !important;
    pointer-events: all !important;
  `;

  _stylesLoaded = new Defer();

  _iframeLoaded = new Defer();

  constructor({ cliqz, debug }) {
    const view = {
      hideSettings() {},
    };
    super({ cliqz, view });
    this.isDebug = debug;
  }

  _setHeight(height) {
    if (height === 0) {
      this.ui.classList.remove('opened');
    } else {
      this.ui.classList.add('opened');
    }
    const heightInPx = `${Math.min(height, this._getMaxHeight())}px`;
    this.iframe.style.height = heightInPx;
  }

  get textInput() {
    return this.input;
  }

  get entryPoint() {
    return `overlay${this._trigger}`;
  }

  close() {
    super.close();
    this.ui.classList.add('hidden');
    this.root.style = this.OFF_STYLES;
    this._setUrlbarValue('');
  }

  get isOverlayVisible() {
    return !this.ui.classList.contains('hidden');
  }

  async toggle(trigger, query = '') {
    await this._stylesLoaded.promise;
    await this._iframeLoaded.promise;
    this.ui.classList.toggle('hidden');
    this.collapse();
    if (this.isOverlayVisible) {
      this.root.style = this.ON_STYLES;
      this._trigger = trigger;
      this._setUrlbarValue(query);
      this._focus();
      if (query) {
        this._queryCliqz(query);
      }
    } else {
      this.root.style = this.OFF_STYLES;
    }
  }

  _createIframe() {
    const root = document.createElement('span');
    const mode = this.isDebug ? 'open' : 'closed';
    const shadow = root.attachShadow({ mode });
    const html = `
      <div class="ui full-screen hidden channel-${config.settings.channel}">
        <div class="container">
          <input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${chrome.i18n.getMessage('freshtab_urlbar_placeholder')}" tabindex="0">
          <div class="dropdown">
            <iframe id="cliqz-dropdown" src="${chrome.runtime.getURL('modules/dropdown/dropdown.html?cross-origin')}" style="height: 0px;">
          </div>
        </div>
      </div>`;
    shadow.innerHTML = html;
    shadow.querySelector('iframe')
      .addEventListener('load', this._iframeLoaded.resolve, { once: true });
    root.style = this.OFF_STYLES;
    root.addEventListener('click', ev => ev.stopImmediatePropagation());
    root.setAttribute('onclick', 'this.parentNode.removeChild(this)');

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.href = chrome.runtime.getURL('modules/overlay/styles/overlay.css');
    link.addEventListener('load', this._stylesLoaded.resolve, { once: true });
    shadow.appendChild(link);
    document.documentElement.appendChild(root);

    this.root = root;
    this.ui = shadow.querySelector('.ui');
    this.input = shadow.querySelector('input');
    return shadow.querySelector('iframe');
  }

  _getHeight() {
    return parseInt(this.iframe.style.height, 10);
  }

  _getUrlbarAttributes() {
    return {
      padding: 35
    };
  }

  _getMaxHeight() {
    return window.innerHeight * 0.8;
  }
}
