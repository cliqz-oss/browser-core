import Spanan from 'spanan';

import { registerContentScript, isTopWindow /* , CHROME_MSG_SOURCE */} from '../core/content/helpers';
import createSpananWrapper from '../core/helpers/spanan-module-wrapper';
import Dropdown from '../core/dropdown/content';
import config from '../core/config';

const DEBUG = config.enviroment !== 'production';

class OverlayDropdown extends Dropdown {
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

  _reportClick() {
    // TODO
  }

  get textInput() {
    return this.input;
  }

  close() {
    this.setHeight(0);
    this.ui.classList.add('hidden');
    this._setUrlbarValue('');
  }

  get isOverlayVisible() {
    return !this.ui.classList.contains('hidden');
  }

  toggle() {
    this.root.style = 'display: block!important';
    this.ui.classList.toggle('hidden');
    this.setHeight(0);
    if (this.isOverlayVisible) {
      this._setUrlbarValue('');
      this._focus();
    }
  }

  _createIframe() {
    const root = document.createElement('span');
    const shadow = root.attachShadow({ mode: DEBUG ? 'open' : 'closed' });
    const html = `
      <div class="ui full-screen hidden channel-${config.settings.channel}">
        <div class="container">
          <input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${chrome.i18n.getMessage('freshtab_urlbar_placeholder')}" tabindex="0">
          <div class="dropdown">
            <iframe id="cliqz-dropdown" src="${chrome.runtime.getURL('modules/dropdown/dropdown.html?cross-origin')}" style="height: 0px;">
          </div>
        </div>
      </div>
    `;
    shadow.innerHTML = html;
    root.style = 'display: none!important';
    root.addEventListener('click', ev => ev.stopImmediatePropagation());
    root.setAttribute('onclick', 'this.parentNode.removeChild(this)');

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.href = chrome.runtime.getURL('modules/overlay/styles/overlay.css');
    shadow.appendChild(link);

    const firstElement = document.querySelector('body > :first-child');
    if (firstElement) {
      document.body.insertBefore(root, firstElement);
    } else {
      document.body.appendChild(root);
    }

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
  ['onKeydown', 'onInput', 'onKeyPress'].forEach((methodName) => {
    const eventName = methodName.slice(2).toLowerCase();
    dropdown.input.addEventListener(eventName, (ev) => {
      if (dropdown.isOverlayVisible) {
        ev.stopImmediatePropagation();
      }
      if (dropdown[methodName](ev)) {
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
  const freshtabWrapper = createSpananWrapper('search');
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
    renderResults: (results) => {
      dropdown.render({
        rawResults: results,
      });
    },
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.module === 'overlay' && message.action === 'toggle-quicksearch') {
      createFrame(dropdown);
      dropdown.toggle();
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
        dropdown.toggle();
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
