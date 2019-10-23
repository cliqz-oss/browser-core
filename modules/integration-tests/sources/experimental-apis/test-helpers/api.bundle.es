/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals Components, ChromeUtils, ExtensionAPI, addMessageListener, sendAsyncMessage, content */
import Defer from '../../../core/helpers/defer';

const { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { Management: { global: { windowTracker } } } = ChromeUtils.import('resource://gre/modules/Extension.jsm', null);
const { ExtensionError } = ExtensionParent;

const TIP = Components
  .classes['@mozilla.org/text-input-processor;1']
  .createInstance(Components.interfaces.nsITextInputProcessor);

const frameScript = () => {
  const window = content.window;
  const document = content.window.document;

  function getNodeInfo(node, options) {
    const { attributes, properties, text, html, classes, children, styles } = options;
    const info = {};
    if (attributes) {
      info.attributes = [...node.attributes].reduce((attrs, attribute) => {
        attrs[attribute.name] = attribute.value; // eslint-disable-line
        return attrs;
      }, {});
    }
    if (classes) {
      info.classes = Array.from(node.classList);
    }

    if (children) {
      info.children = node.children.length;
    }

    if (properties) {
      info.properties = properties.reduce((props, propName) => {
        props[propName] = node[propName]; // eslint-disable-line
        return props;
      }, {});
    }

    if (text) {
      info.text = node.textContent;
    }
    if (html) {
      info.html = node.innerHTML;
    }

    if (styles && styles.length) {
      const css = window.getComputedStyle(node);
      info.styles = styles.reduce((props, propName) => {
        props[propName] = css[propName]; // eslint-disable-line
        return props;
      }, {});
    }
    return info;
  }

  function querySelector(selector, options = {}) {
    const { single } = options;
    let nodes;

    if (single) {
      nodes = [document.querySelector(selector)];
    } else {
      nodes = [...document.querySelectorAll(selector)];
    }

    if (nodes.length === 0 || nodes[0] === null) {
      return single ? null : [];
    }

    const result = nodes.map(node => getNodeInfo(node, options));

    return single ? result[0] : result;
  }

  addMessageListener('DropdownSpy:MessageIn', {
    receiveMessage({ data }) {
      const { messageId, message } = data;
      const { action, selector, options } = message;
      let result = null;
      switch (action) {
        case 'querySelector':
        case 'querySelectorAll':
          options.single = action === 'querySelector';
          result = querySelector(selector, options);
          break;
        case 'callMethod':
          result = document.querySelector(selector)[options.method](...options.args);
          break;
        case 'callMethodExt': {
          const els = document.querySelectorAll(selector);
          const idx = options.index;
          if ((idx < 0) || (idx >= els.length)) {
            break;
          }
          const el = els[idx];
          if ((options.method === 'click') && options.mouseEventOptions) {
            const ev = new window.MouseEvent('click', {
              bubbles: true,
              cancelable: false,
              ctrlKey: options.mouseEventOptions.ctrlKey || false,
            });
            el.dispatchEvent(ev);
            break;
          }
          result = el[options.method](...options.args);
          break;
        }
        default:
          throw new Error(`Unknown action "${action}"`);
      }

      sendAsyncMessage('DropdownSpy:MessageOut', { messageId, message: result });
    },
  });
};


global.testHelpers = class extends ExtensionAPI {
  DEFAULT_QUERY_OPTIONS = {
    attributes: true,
    classes: true,
    properties: [],
    children: true,
    text: true,
    html: true,
    styles: [],
  };

  constructor(extension) {
    super(extension);
    this.extension = extension;
    this.browsers = new Map();
    this._messageId = 0;
    this._responses = new Map();

    this.onWindowOpened = this._onWindowOpened.bind(this);
    this.onWindowClosed = this._onWindowClosed.bind(this);
    windowTracker.addOpenListener(this.onWindowOpened);
    windowTracker.addCloseListener(this.onWindowClosed);
    for (const window of windowTracker.browserWindows()) {
      this.onWindowOpened(window);
    }
  }

  get nextMessageId() {
    return this._messageId++; // eslint-disable-line
  }

  _onWindowOpened(window) {
    this.EventUtils = { window };
    Services.scriptloader.loadSubScript(
      this.extension.baseURI.resolve('modules/core/EventUtils.js'),
      this.EventUtils,
      'UTF-8'
    );

    this.browsers.set(window, null);
  }

  _onWindowClosed(window) {
    const browser = this.browsers.get(window);
    if (browser) {
      browser.messageManager.removeMessageListener('DropdownSpy:MessageOut', this);
      this.browsers.delete(window);
    }
  }

  _getWindow(windowId) {
    return windowId === null
      ? windowTracker.getCurrentWindow()
      : windowTracker.getWindow(windowId, null);
  }

  receiveMessage({ data }) {
    const { messageId, message } = data;
    const response = this._responses.get(messageId);
    if (!response) {
      throw new ExtensionError('DropdownSpy responsed to a request nobody made.');
    }
    response.resolve(message);
    this._responses.delete(messageId);
  }

  _getBrowser(windowId = null) {
    const window = this._getWindow(windowId);
    let browser = this.browsers.get(window);
    if (browser !== null) {
      return browser;
    }
    browser = window.document.querySelector('#cliqz-popup');
    if (!browser) {
      throw new ExtensionError('Can\'t spy on dropdown, it is not overriden (yet?)');
    }
    this.browsers.set(window, browser);
    const script = `data:text/javascript,(${encodeURI(frameScript)}).call(this)`;
    browser.messageManager.loadFrameScript(script, true, true);
    browser.messageManager.addMessageListener('DropdownSpy:MessageOut', this);

    return browser;
  }

  async _sendMessage(browser, message) {
    const messageId = this.nextMessageId;
    const response = new Defer();
    this._responses.set(messageId, response);
    browser.messageManager.sendAsyncMessage('DropdownSpy:MessageIn', {
      messageId,
      message
    });
    return response.promise;
  }

  async _getDropdownHeight(windowId) {
    const browser = await this._getBrowser(windowId);
    let height = parseInt(browser.style.height, 10);
    if (isNaN(height)) {
      height = 0;
    }
    return height;
  }

  getAPI() {
    return {
      testHelpers: {
        sendString: (windowId, text) => {
          const window = this._getWindow(windowId);

          return this.EventUtils.sendString(text, window);
        },
        getDropdownHeight: windowId => this._getDropdownHeight(windowId),
        getLastQuery: async (windowId) => {
          const window = await this._getWindow(windowId);
          const urlbar = window.gURLBar;
          const lastQueryBox = Array.from(urlbar.inputField.parentElement.childNodes)
            .find(node => node.id === 'cliqzLastQueryBox');
          const visible = !!lastQueryBox && lastQueryBox.style.display !== 'none';
          return {
            visible,
            text: visible ? lastQueryBox.textContent : null,
          };
        },
        querySelector: async (selector, _options) => {
          const options = { ...this.DEFAULT_QUERY_OPTIONS, ..._options };
          const browser = await this._getBrowser(options.windowId);
          const response = await this._sendMessage(browser, {
            action: 'querySelector',
            selector,
            options
          });
          return response;
        },
        querySelectorAll: async (selector, _options) => {
          const options = { ...this.DEFAULT_QUERY_OPTIONS, ..._options };
          const browser = await this._getBrowser(options.windowId);
          const response = await this._sendMessage(browser, {
            action: 'querySelectorAll',
            selector,
            options
          });
          return response;
        },
        callMethod: async (selector, method, args) => {
          const browser = await this._getBrowser();
          const response = await this._sendMessage(browser, {
            action: 'callMethod',
            selector,
            options: {
              method,
              args: args || [],
            }
          });
          return response;
        },
        callMethodExt: async (selector, method, { index, mouseEventOptions, args }) => {
          const browser = await this._getBrowser();
          const response = await this._sendMessage(browser, {
            action: 'callMethodExt',
            selector,
            options: {
              method,
              index,
              mouseEventOptions,
              args: args || [],
            }
          });
          return response;
        },
        press: (options) => {
          const window = this._getWindow(options.windowId);
          let modifierEvent;

          const event = new window.KeyboardEvent('keydown', {
            key: options.key,
            code: options.code || options.key
          });

          TIP.beginInputTransaction(window, () => {});

          if (options.ctrlKey) {
            modifierEvent = new window.KeyboardEvent('keydown', {
              key: 'Control',
              code: 'ControlLeft'
            });
            TIP.keydown(modifierEvent);
          }

          if (options.shiftKey) {
            modifierEvent = new window.KeyboardEvent('keydown', {
              key: 'Shift',
              code: 'ShiftLeft'
            });
            TIP.keydown(modifierEvent);
          }

          if (options.altKey) {
            modifierEvent = new window.KeyboardEvent('keydown', {
              key: 'Alt',
              code: 'AltLeft'
            });
            TIP.keydown(modifierEvent);
          }

          if (options.metaKey) {
            modifierEvent = new window.KeyboardEvent('keydown', {
              key: 'Meta',
              code: 'OSLeft'
            });
            TIP.keydown(modifierEvent);
          }

          TIP.keydown(event);
        },
        release: (options) => {
          const window = this._getWindow(options.windowId);
          const event = new window.KeyboardEvent('keyup', {
            key: options.key,
            code: options.code || options.key,
            ctrlKey: options.ctrlKey || false,
            shiftKey: options.shiftKey || false,
            altKey: options.altKey || false,
            metaKey: options.metaKey || false
          });
          TIP.beginInputTransaction(window, () => {});
          TIP.keyup(event);
        },

        focus: (windowId) => {
          const window = this._getWindow(windowId);
          window.gURLBar.focus();
        },
        blur: (windowId) => {
          const window = this._getWindow(windowId);
          window.gURLBar.blur();
        },
        get: async (windowId) => {
          const window = this._getWindow(windowId);
          const urlbar = window.gURLBar;
          return {
            value: urlbar.value,
            focused: window.Services.focus.focusedElement === urlbar.inputField,
            height: await this._getDropdownHeight(windowId),
            visibleValue: urlbar.inputField.value,
            selectionStart: urlbar.selectionStart,
            selectionEnd: urlbar.selectionEnd,
          };
        },
        update: (windowId, details) => {
          const window = this._getWindow(windowId);
          const urlbar = window.gURLBar;
          // 1. focus/blur
          if (details.focused !== null) {
            if (urlbar.focused !== details.focused) {
              urlbar[details.focused ? 'focus' : 'blur']();
            }
          }

          // 2. value/selection change
          if (typeof details.value === 'string' && urlbar.value !== details.value) {
            urlbar.value = details.value;
          }
          if (typeof details.visibleValue === 'string' && urlbar.inputField.value !== details.visibleValue) {
            urlbar.inputField.value = details.visibleValue;
          }
          if (typeof details.selectionStart === 'number' && urlbar.selectionStart !== details.selectionStart) {
            urlbar.selectionStart = details.selectionStart;
          }
          if (typeof details.selectionEnd === 'number' && urlbar.selectionEnd !== details.selectionEnd) {
            urlbar.selectionEnd = details.selectionEnd;
          }
        },
      }
    };
  }

  onShutdown() {
    windowTracker.removeCloseListener(this.onWindowClosed);
    windowTracker.removeOpenListener(this.onWindowOpened);
    for (const window of windowTracker.browserWindows()) {
      this.onWindowClosed(window);
    }
  }
};
