/* eslint import/prefer-default-export: 'off' */

function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

export class Subject {
  constructor({ waitForFirstMessage = false } = {}) {
    this.waitForFirstMessage = waitForFirstMessage;
    this.modules = {};
    this.messages = [];
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

          listeners.forEach((l) => {
            l({
              action,
              response,
              type: 'response',
              requestId,
              source: 'cliqz-content-script',
              args
            });
          });
        }
      },
      i18n: {
        getMessage: k => k,
      }
    };
  }

  load(buildUrl, { iframeWidth = 900 } = {}) {
    this.iframe = document.createElement('iframe');
    this.iframe.src = buildUrl;
    this.iframe.width = iframeWidth;
    this.iframe.height = 700;
    document.body.appendChild(this.iframe);

    return new Promise((resolve) => {
      this.iframe.contentWindow.chrome = this.chrome;
      this.iframe.contentWindow.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data);
        this.messages.push(data);
        if (this.waitForFirstMessage) {
          resolve();
        }
      });
      this.iframe.contentWindow.addEventListener('load', () => {
        if (!this.waitForFirstMessage) {
          resolve();
        }
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

  get activeElement() {
    return this.iframe.contentWindow.document.activeElement;
  }

  get body() {
    return this.iframe.contentWindow.document.body;
  }

  query(selector) {
    return this.iframe.contentWindow.document.querySelector(selector);
  }

  queryAll(selector) {
    return this.iframe.contentWindow.document.querySelectorAll(selector);
  }

  pushData(target, data = {}, action = 'render_template') {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target,
      origin: 'window',
      message: {
        action,
        data,
      }
    }), '*');
    return wait(500);
  }

  respondsWith({ module, action, response }) {
    this.modules[module] = this.modules[module] || { actions: {} };
    this.modules[module].actions[action] = response;
  }

  getComputedStyle(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }

  getComputedStyleOfElement(element) {
    return this.iframe.contentWindow.getComputedStyle(element);
  }
}
