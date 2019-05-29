import Spanan from 'spanan';

import { registerContentScript, isTopWindow /* , CHROME_MSG_SOURCE */} from '../core/content/helpers';
import createSpananWrapper from '../core/helpers/spanan-module-wrapper';
import Dropdown from '../core/dropdown/content';
import config from '../core/config';
import Defer from '../core/helpers/defer';

const DEBUG = config.environment !== 'production';

class OverlayDropdown extends Dropdown {
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

  constructor({ cliqz }) {
    const view = {
      hideSettings() {},
    };
    super({ cliqz, view });
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
    this.cliqz.search.stopSearch({ entryPoint: this.entryPoint });
  }

  get isOverlayVisible() {
    return !this.ui.classList.contains('hidden');
  }

  async toggle(trigger) {
    await this._stylesLoaded.promise;
    this.ui.classList.toggle('hidden');
    this.setHeight(0);
    if (this.isOverlayVisible) {
      this.root.style = this.ON_STYLES;
      this._trigger = trigger;
      this._setUrlbarValue('');
      this._focus();
    } else {
      this.root.style = this.OFF_STYLES;
    }
  }

  _createIframe() {
    const root = document.createElement('span');
    const mode = DEBUG ? 'open' : 'closed';
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
    root.style = this.OFF_STYLES;
    root.addEventListener('click', ev => ev.stopImmediatePropagation());
    root.setAttribute('onclick', 'this.parentNode.removeChild(this)');

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.href = chrome.runtime.getURL('modules/overlay/styles/overlay.css');
    link.onload = this._stylesLoaded.resolve;
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

  _getMaxHeight() {
    return window.innerHeight * 0.8;
  }
}

function createFrame(dropdown) {
  if (dropdown.iframe) {
    return;
  }
  dropdown.createIframeWrapper();
  ['onKeydown', 'onInput', 'onKeyPress', 'onBlur'].forEach((methodName) => {
    const eventName = methodName.slice(2).toLowerCase();
    dropdown.input.addEventListener(eventName, (ev) => {
      if (dropdown.isOverlayVisible) {
        ev.stopImmediatePropagation();
      }
      if (eventName !== 'blur' && dropdown[methodName](ev)) {
        ev.preventDefault();
      }
    });
  });
  dropdown.ui.addEventListener('click', (ev) => {
    if (ev.target === dropdown.ui) {
      ev.stopImmediatePropagation();
      dropdown.close();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);
  window.addEventListener('message', dropdown.onMessage);
  window.addEventListener('keyup', (event) => {
    if (dropdown.isOverlayVisible) {
      event.stopImmediatePropagation();
    }
    if (dropdown.isOpen) {
      event.stopPropagation();
    }
  }, true);
}

function onLoad(_window, chrome) {
  const window = _window;
  const searchWrapper = createSpananWrapper('search');
  const search = searchWrapper.createProxy();
  const coreWrapper = createSpananWrapper('core');
  const core = coreWrapper.createProxy();
  const freshtabWrapper = createSpananWrapper('freshtab');
  const freshtab = freshtabWrapper.createProxy();
  const cliqz = {
    core,
    search,
    freshtab,
  };

  const dropdown = new OverlayDropdown({
    cliqz,
  });
  const api = new Spanan();
  api.export({
    renderResults: (response) => {
      dropdown.render({
        rawResults: response.results,
      });
    },
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.module === 'overlay' && message.action === 'toggle-quicksearch') {
      createFrame(dropdown);
      dropdown.toggle(message.trigger);
    }
    coreWrapper.handleMessage(message);
    searchWrapper.handleMessage(message);
    freshtabWrapper.handleMessage(message);
    api.handleMessage(message);
  });

  if (DEBUG) {
    if (!window.CLIQZ) {
      window.CLIQZ = {};
    }
    if (!window.CLIQZ.tests) {
      window.CLIQZ.tests = {};
    }
    window.CLIQZ.tests.overlay = {
      toggle: () => {
        createFrame(dropdown);
        dropdown.toggle('FromTests');
      },
      fillIn(query) {
        dropdown.input.value = query;
        search.startSearch(query, { key: 'KeyT', isTyped: true });
      },
      close: () => {
        dropdown.close();
      }
    };
  }
}

registerContentScript('overlay', '*', (window, chrome) => {
  if (isTopWindow(window)) {
    if (window.document && window.document.body) {
      onLoad(window, chrome);
    } else {
      window.addEventListener('DOMContentLoaded', () => onLoad(window, chrome));
    }
  }
});
