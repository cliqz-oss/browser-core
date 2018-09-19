import Spanan from 'spanan';

import { registerContentScript /* , CHROME_MSG_SOURCE */} from '../core/content/helpers';
import createSpananWrapper from '../core/helpers/spanan-module-wrapper';
import Dropdown from '../core/dropdown/content';
import STYLES from './content/styles';

class OverlayDropdown extends Dropdown {
  _setHeight(height) {
    const heightInPx = `${height}px`;
    this.iframe.style.height = heightInPx;
  }

  _getHeight() {
    return parseInt(this.iframe.style.height, 10);
  }
}

const DEBUG = true;

function createOverlay() {
  const root = document.createElement('span');
  root.classList.add('cliqz-search');
  const shadow = root.attachShadow({ mode: DEBUG ? 'open' : 'closed' });

  const overlay = document.createElement('div');
  const ui = document.createElement('div');
  const input = document.createElement('input');
  const container = document.createElement('div');
  const iframe = document.createElement('iframe');
  const style = document.createElement('style');

  function toggle() {
    overlay.classList.toggle('hidden');
    ui.classList.toggle('hidden');
    if (!ui.classList.contains('hidden')) {
      input.focus();
    }
  }

  overlay.classList.add('overlay');
  overlay.classList.add('full-screen');
  overlay.classList.add('hidden');

  ui.classList.add('full-screen');
  ui.classList.add('hidden');
  ui.classList.add('ui');

  container.classList.add('container');
  ui.appendChild(container);

  container.appendChild(input);

  iframe.style.height = '0px';
  iframe.id = 'cliqz-dropdown';
  iframe.src = chrome.runtime.getURL('modules/dropdown/dropdown.html?cross-origin');
  container.appendChild(iframe);

  style.textContent = STYLES;

  shadow.appendChild(style);
  shadow.appendChild(overlay);
  shadow.appendChild(ui);

  document.body.appendChild(root);

  return {
    input,
    iframe,
    toggle,
  };
}

function onLoad() {
  const searchWrapper = createSpananWrapper('search');
  const search = searchWrapper.createProxy();
  const coreWrapper = createSpananWrapper('core');
  const core = searchWrapper.createProxy();
  const cliqz = {
    core,
    search,
    freshtab: {
      selectResult() {},
      removeFromHistory() { return Promise.resolve(); },
      removeFromBookmarks() { return Promise.resolve(); },
    },
  };

  const overlay = createOverlay();

  const view = {
    state: {
      get iframeHeight() {
        return overlay.iframe.height;
      },
    },
    hideSettings() {},
    textInput: overlay.input,
  };

  const dropdown = new OverlayDropdown({
    view,
    cliqz,
  });
  dropdown.createIframeWrapper(overlay.iframe);
  overlay.input.addEventListener('keydown', (ev) => {
    if (dropdown.onKeydown(ev)) {
      ev.preventDefault();
    }
  });
  overlay.input.addEventListener('input', (ev) => {
    if (dropdown.onInput(ev)) {
      ev.preventDefault();
    }
  });
  overlay.input.addEventListener('keypress', (ev) => {
    if (dropdown.onKeyPress(ev)) {
      ev.preventDefault();
    }
  });
  window.addEventListener('message', dropdown.onMessage);
  const API = {
    renderResults: (results) => {
      dropdown.render({
        rawResults: results,
      });
    },
  };

  const api = new Spanan();
  api.export(API);

  chrome.runtime.onMessage.addListener((message) => {
    coreWrapper.handleMessage(message);
    searchWrapper.handleMessage(message);
    api.handleMessage(message);
  });

  window.addEventListener('keyup', (event) => {
    if ((event.metaKey || event.ctrlKey || event.altKey) && event.code === 'Space') {
      overlay.toggle();
    }
  });

  if (DEBUG) {
    if (!window.CLIQZ) {
      window.CLIQZ = {};
    }
    if (!window.CLIQZ.tests) {
      window.CLIQZ.tests = {};
    }
    window.CLIQZ.tests.overlay = {
      toggle: () => overlay.toggle(),
      fillIn(query) {
        overlay.input.value = query;
        search.startSearch(query, { key: 'KeyT' });
      },
    };
  }
}

registerContentScript('overlay', '*', () => {
  const isTopLevel = window.parent && window.parent === window;
  if (isTopLevel) {
    if (window.document && window.document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('DOMContentLoaded', onLoad);
    }
  }
});
