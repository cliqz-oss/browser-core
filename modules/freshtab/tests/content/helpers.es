import config from '../../../core/config';

export const CONFIG = config;

export const clone = o => JSON.parse(JSON.stringify(o));

export function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

let intervals = [];
export function registerInterval(interval) {
  intervals.push(interval);
}

export function clearIntervals() {
  intervals.forEach(interval => clearInterval(interval));
  intervals = [];
}

export function waitFor(fn) {
  var resolver, rejecter, promise = new Promise(function (res, rej) {
    resolver = res;
    rejecter = rej;
  });

  function check() {
    const result = fn();
    if (result) {
      clearInterval(interval);
      resolver(result);
    }
  }

  var interval = setInterval(check, 50);
  check();
  registerInterval(interval);

  return promise;
}

export class Subject {
  constructor() {
    this.modules = {};
    const listeners = new Set();
    this.chrome = {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.add(listener);
          },
          removeListener(listener) {
            listeners.delete(listener);
          }
        },
        sendMessage: ({ module, action, requestId, args }) => {
          const response = this.modules[module].actions[action];

          listeners.forEach(l => {
            l({
              action,
              response,
              type: 'response',
              requestId,
              source: 'cliqz-content-script',
              args
            });
          })
        }
      },
      i18n: {
        getMessage: k => k,
      }
    }
  }

  load({iframeWidth = 900} = {}) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = '/build/cliqz@cliqz.com/chrome/content/freshtab/home.html';
    this.iframe.width = iframeWidth;
    this.iframe.height = 500;
    document.body.appendChild(this.iframe)

    return new Promise(resolve => {
      this.iframe.contentWindow.chrome = this.chrome;
      this.iframe.contentWindow.addEventListener('load', () => {
        resolve()
      });
    });
  }

  unload() {
    document.body.removeChild(this.iframe);
  }

  queryByI18n(switchLabel) {
    const xpath = `//span[text()="${switchLabel}"]`;
    const switchElement = this.iframe.contentWindow.document
      .evaluate(xpath, this.iframe.contentWindow.document, null, XPathResult.ANY_TYPE, null)
      .iterateNext();
    if (switchElement !== null) {
      return (switchElement.closest('div'));
    }
    return null;
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  get activeElement() {
    return this.iframe.contentWindow.document.activeElement;
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(data = {}) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-freshtab',
      origin: 'window',
      message:  {
        action: 'pushData',
        data,
      }
    }), '*');
    return wait(500);
  }

  getComputedStyle(selector) {
    return this.iframe.contentWindow.getComputedStyle(this.query(selector));
  }

  respondsWith({ module, action, response, requestId }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }

  get body() {
    return this.iframe.contentWindow.document.body;
  }
}

export const defaultConfig = {
  module: 'freshtab',
  action: 'getConfig',
  response: {
    locale: 'en',
    newTabUrl: config.settings.NEW_TAB_URL,
    isBrowser: false,
    showNewBrandAlert: false,
    messages: {},
    isHistoryEnabled: true,
    hasActiveNotifications: false,
    isBlueBackgroundSupported: true,
    isBlueThemeSupported: true,
    isBlue: false,
    componentsState: {
      historyDials: {
        visible: false
      },
      customDials: {
        visible: false
      },
      search: {
        visible: false
      },
      news: {
        visible: false,
        preferedCountry: 'de'
      },
      background: {
        image: 'bg-blue'
      }
    }
  },
};
