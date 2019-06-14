import Spanan from 'spanan';

import { registerContentScript, isTopWindow /* , CHROME_MSG_SOURCE */} from '../core/content/helpers';
import createSpananWrapper from '../core/helpers/spanan-module-wrapper';
import OverlayDropdownManager from '../dropdown/managers/overlay';
import config from '../core/config';

const DEBUG = config.environment !== 'production';

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

  const dropdown = new OverlayDropdownManager({
    cliqz,
    debug: DEBUG,
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
      dropdown.toggle(message.trigger, message.query || '');
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
        dropdown._queryCliqz(query);
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
