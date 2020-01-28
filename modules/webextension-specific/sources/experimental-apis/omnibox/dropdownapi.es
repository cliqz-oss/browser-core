/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global ChromeUtils,
   addMessageListener, sendAsyncMessage,  windowTracker */
import Defer from '../../../core/helpers/defer';
import LifeCycle from '../../../core/app/life-cycle';
import BrowserDropdownManager from '../../../dropdown/managers/browser';
import { PASSIVE_LISTENER_OPTIONS } from '../../../dropdown/managers/utils';
import URLBar from './urlbar';

const { E10SUtils } = ChromeUtils.import('resource://gre/modules/E10SUtils.jsm');
const { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { ExtensionUtils } = ChromeUtils.import('resource://gre/modules/ExtensionUtils.jsm');
const { promiseEvent } = ExtensionUtils;

const STYLESHEET_URL = `modules/dropdown/styles/xul.css?${Date.now()}`;
const DROPDOWN_URL = '/modules/dropdown/dropdown.html';

/**
 * Frame script to be injected into <browser> hosting search results document. It:
 * 1. Forwards incoming `Dropdown:MessageIn` messages from `browser.messageManager`
 *    to the document with `postMessage`.
 * 2. Forwards outgoing messages sent from document with `postMessage` back
 *    through `browser.messageManager` as `Dropdown:MessageOut`.
 *
 * TODO: this tricky scheme probably should be replaced with normal extension messaging.
 */
const frameScript = () => {
  const incomingMessages = new Set();
  let messageId = 1;

  addMessageListener('Dropdown:MessageIn', {
    receiveMessage({ data }) {
      messageId += 1;
      data.messageId = messageId; // eslint-disable-line
      incomingMessages.add(data.messageId);
      content.window.postMessage(data, '*'); // eslint-disable-line
    },
  });

  // eslint-disable-next-line no-undef
  addEventListener('message', (ev) => {
    const message = ev.data;
    try {
      if (incomingMessages.delete(message.messageId)) {
        // ignore own messages
        return;
      }
    } catch (e) {
      //
    }

    delete message.messageId;

    sendAsyncMessage('Dropdown:MessageOut', message);
  }, true, true);
};

/**
 * Class implementing Cliqz Search (urlbar + dropdown). When initialized:
 *
 * 1. Takes over the original Firefox autocomplete
 * 2. Creates custom <browser> element hosting results page
 * 3. Establishes communicaion channel between this API and the <browser> so that:
 *    - all messages send with `sendMessage` method are passed down to the results page;
 *    - all messages sent by the results page are emitted as `message` event.
 * 4. Initializes BrowserDropdownManager which glues `URLBar` and `Dropdown` together.
 */
export default class Dropdown extends LifeCycle {
  _urlbar = null;

  constructor({ extension, window, placeholder }) {
    const windowId = windowTracker.getId(window);
    const name = `dropdown-${windowId}`;

    super(name);
    this._window = window;
    this._windowId = windowId;
    this._extension = extension;
    this._placeholder = placeholder;
  }

  _init() {
    this._addStylesheet();
    const ready = this._createToolbarAndBrowser();

    const urlbar = new URLBar({
      window: this._window,
      placeholder: this._placeholder,
    });
    // Override Firefox urlbar
    urlbar.init();

    // Create and initialize DropdownManager for this dropdown
    const dropdownManager = new BrowserDropdownManager({
      window: this._window,
      windowId: this._windowId,
      urlbar,
      startupReason: this._extension.startupReason,
    }, this);
    dropdownManager.init();
    dropdownManager.createIframeWrapper();
    urlbar.on('close', dropdownManager.close);

    this._dropdownManager = dropdownManager;
    this._urlbar = urlbar;

    this._window.addEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);
    this._window.gNavToolbox.addEventListener('customizationstarting', this);

    // Calculate initial max height value
    this._updateMaxHeight();
    return ready;
  }

  _unload() {
    this._window.gNavToolbox.removeEventListener('customizationstarting', this);
    this._window.removeEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);
    this._urlbar.off('close', this._dropdownManager.close);
    this._dropdownManager.unload();
    this._urlbar.unload();
    this._dropdownManager = null;
    this._urlbar = null;
    this._destroyToolbarAndBrowser();
    this._removeStylesheet();
  }

  _addStylesheet() {
    const document = this._window.document;
    const stylesheet = document.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = this._extension.baseURI.resolve(STYLESHEET_URL);
    stylesheet.type = 'text/css';
    stylesheet.style.display = 'none';
    stylesheet.classList.add('cliqz-theme');

    document.documentElement.appendChild(stylesheet);
  }

  _removeStylesheet() {
    const document = this._window.document;
    Array.from(document.querySelectorAll('.cliqz-theme'))
      .forEach(stylesheet => stylesheet.remove());
  }

  _createToolbarAndBrowser() {
    const document = this._window.document;
    const readyDefer = new Defer();

    // Create <browser> element where search results document will be rendered
    // and make all the webextension APIs available in it.

    // This is done very similar to the way browsers for browserAction/pageAction are created:
    // https://github.com/mozilla/gecko-dev/blob/master/browser/components/extensions/ExtensionPopups.jsm
    const browser = document.createXULElement
      ? document.createXULElement('browser')
      : document.createElement('browser');
    browser.setAttribute('type', 'content');
    browser.setAttribute('id', 'cliqz-popup');
    browser.setAttribute('disableglobalhistory', 'true');
    browser.setAttribute('transparent', 'true');
    browser.setAttribute('class', 'webextension-popup-browser');
    browser.setAttribute('webextension-view-type', 'popup');
    browser.setAttribute('tooltip', 'aHTMLTooltip');
    browser.setAttribute('contextmenu', 'contentAreaContextMenu');
    browser.setAttribute('autocompletepopup', 'PopupAutoComplete');
    browser.setAttribute('selectmenulist', 'ContentSelectDropdown');
    browser.setAttribute('selectmenuconstrained', 'false');
    browser.setAttribute('ignorekeys', 'false');
    browser.setAttribute('flex', '1');
    browser.style.MozUserFocus = 'ignore';
    browser.tabIndex = -1;

    // Ensure that the browser is going to run in the same process of the other
    // extension pages from the same addon.
    browser.sameProcessAsFrameLoader = this._extension.groupFrameLoader || null;

    let readyPromise;
    // Respect extension's "remoteness"
    if (this._extension.remote) {
      browser.setAttribute('remote', 'true');
      browser.setAttribute('remoteType', E10SUtils.EXTENSION_REMOTE_TYPE);
      browser.setAttribute('renderroot', 'content');
      readyPromise = promiseEvent(browser, 'XULFrameLoaderCreated');
    } else {
      readyPromise = promiseEvent(browser, 'load');
    }

    readyPromise.then(() => {
      // Here we establish communication channel between browser contents and this API
      // by injecting framescript bridging `browser.messageManager` and document's `postMessages`.
      const script = `data:text/javascript,(${encodeURI(frameScript)}).call(this)`;
      browser.messageManager.loadFrameScript(script, true, true);
      browser.messageManager.addMessageListener('Dropdown:MessageOut', this);
      readyDefer.resolve();
    });

    const parentElement = document.getElementById('navigator-toolbox');
    const navToolbar = document.getElementById('nav-bar');
    const container = document.createElement('div');
    container.appendChild(browser);

    const cliqzToolbar = document.createElement('toolbar');
    cliqzToolbar.setAttribute('fullscreentoolbar', 'true');
    cliqzToolbar.id = 'cliqz-toolbar';
    // Default height of `toolbar` and `browser` elements should be set to 0,
    // otherwise they will be visible during extension init/update (see EX-9266)
    cliqzToolbar.style.display = 'block';
    browser.style.display = 'block';
    cliqzToolbar.style.height = 0;
    cliqzToolbar.style.minHeight = 0;
    cliqzToolbar.style.padding = 0;
    cliqzToolbar.appendChild(container);
    parentElement.insertBefore(cliqzToolbar, navToolbar.nextSibling);

    // Create a new stacking context around browser element (it has z-index 100000)
    // so nav-bar element gets higher above on z-axis (see EX-8720)
    cliqzToolbar.style.position = 'relative';
    cliqzToolbar.style.zIndex = 2;
    navToolbar.style.zIndex = 3;

    ExtensionParent.apiManager.emit('extension-browser-inserted', browser);

    // Load search results document into the browser
    const url = this._extension.baseURI.resolve(DROPDOWN_URL);
    try {
      const triggeringPrincipal = this._extension.principal
        || Services.scriptSecurityManager.createNullPrincipal({});
      browser.loadURI(url, { triggeringPrincipal });
    } catch (e) {
      browser.loadURI(url);
    }

    this._browser = browser;
    this._cliqzToolbar = cliqzToolbar;

    return readyDefer.promise;
  }

  _destroyToolbarAndBrowser() {
    this._browser.messageManager.removeMessageListener('Dropdown:MessageOut', this);

    const navToolbar = this._window.document.getElementById('nav-bar');
    navToolbar.setAttribute('overflowable', 'true');
    navToolbar.style.zIndex = 'auto';

    this._cliqzToolbar.remove();
  }

  _updateMaxHeight() {
    const toolboxHeight = this._window.document.getElementById('navigator-toolbox').scrollHeight;
    this._maxHeight = this._window.innerHeight - toolboxHeight - 50;
  }

  handleEvent(event) {
    switch (event.type) {
      case 'resize':
        this._updateMaxHeight();
        break;
      case 'customizationstarting':
        // EX-9303: During browser customization a new `gURLBar` will be created.
        // Destroy exising dropdown override on `customizationstarting`...
        // TODO: This is not needed as of Firefox 71. Consider removing this logic
        // when minimum supported version moves to 71.
        this._window.gNavToolbox.addEventListener('customizationending', this, { once: true });
        this._unload();
        break;
      case 'customizationending':
        // ... and create a new one on `customizationending`.
        this._init();
        break;
      default:
        // This handler cannot be called for any events other than those we subscribed to
    }
  }

  receiveMessage({ data }) {
    return this.emit('message', data);
  }

  getCurrentTab() {
    const tabData = this._extension.tabManager.convert(this._window.gBrowser.selectedTab);
    const incognito = tabData.incognito
      // Forget tab (Cliqz 1.29 and below)
      // Consider removing this once support for older Cliqz versions is dropped.
      || (this._window.gBrowser.selectedBrowser.loadContext
          && this._window.gBrowser.selectedBrowser.loadContext.usePrivateBrowsing);

    return {
      incognito,
      ...tabData
    };
  }

  set height(height) {
    const newHeight = Math.min(this._maxHeight, height);
    this._height = newHeight;
    this._browser.style.height = `${newHeight}px`;

    const navToolbar = this._window.document.getElementById('nav-bar');
    // EX-8720: If newHeight equals 0 then we remove attribute overflowable which
    // results in showing a shadow line under search url bar.
    // Otherwise we need to set this attribute back to nav-bar.
    if (newHeight === 0) {
      navToolbar.setAttribute('overflowable', 'true');
    } else {
      navToolbar.removeAttribute('overflowable');
    }
  }

  get height() {
    return this._height;
  }

  async sendMessage(payload) {
    if (this.isEnabling) {
      await this.isReady();
    }
    this._browser.messageManager.sendAsyncMessage('Dropdown:MessageIn', payload);
  }

  getResult() {
    return {
      selected: this._dropdownManager.selectedResult || null,
      hovered: this._dropdownManager.hoveredResult || null,
    };
  }

  query(query, options) {
    if (options.focus) {
      this._urlbar.focus();
    }
    if (options.openLocation) {
      const command = this._urlbar.textbox.ownerDocument.getElementById('Browser:OpenLocation');
      command.doCommand();
    }
    URLBar.update(this._window, { value: query });
    this._dropdownManager.onInput();
  }
}
