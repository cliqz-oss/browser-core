/* global ChromeUtils, EventManager, addMessageListener, sendAsyncMessage,  windowTracker */
import Defer from '../../../core/helpers/defer';

const { E10SUtils } = ChromeUtils.import('resource://gre/modules/E10SUtils.jsm');
const { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
const { EventEmitter } = ChromeUtils.import('resource://gre/modules/EventEmitter.jsm');

const { ExtensionUtils } = ChromeUtils.import('resource://gre/modules/ExtensionUtils.jsm');
const STYLESHEET_URL = '/modules/dropdown/styles/xul.css';
const AC_PROVIDER_NAME = 'cliqz-results';
const { ExtensionError } = ExtensionParent;

const { promiseEvent } = ExtensionUtils;

function addStylesheet(document, url) {
  const stylesheet = document.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = url;
  stylesheet.type = 'text/css';
  stylesheet.style.display = 'none';
  stylesheet.classList.add('cliqz-theme');

  document.documentElement.appendChild(stylesheet);
}

function removeStylesheet(document, url) {
  const styles = [].slice.call(document.getElementsByClassName('cliqz-theme'));
  styles.filter(style => style.href === url)
    .forEach((stylesheet) => {
      if (!stylesheet.parentNode) {
        return;
      }

      stylesheet.parentNode.removeChild(stylesheet);
    });
}

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

  // eslint-disable-next-line mozilla/balanced-listeners, no-undef
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

// TODO extract common parts
export default class Dropdown extends EventEmitter {
  constructor(extension) {
    super();
    const { remote, principal, groupFrameLoader } = extension;
    this._extension = extension;
    this._remote = remote || false;
    this._principal = principal || Services.scriptSecurityManager.createNullPrincipal({});
    this._groupFrameLoader = groupFrameLoader || null;
    this._overriden = null;
    this._windows = new Map();
  }

  get overriden() {
    return this._overriden;
  }

  get _currentWindow() {
    return windowTracker.getCurrentWindow();
  }

  get _stylesheetURL() {
    return this._resolveURL(STYLESHEET_URL);
  }

  _getWindowId(window) {
    return windowTracker.getId(window);
  }

  _resolveURL(url) {
    return this._extension.baseURI.resolve(url);
  }

  _getDropdown(windowId /* or window */) {
    let w = null;
    if (typeof windowId === 'number') {
      w = windowTracker.getWindow(windowId, null);
    } else if (windowId === null) {
      w = this._currentWindow;
    } else {
      w = windowId;
    }
    return this._windows.get(w);
  }

  _getMaxHeight(windowId) {
    const w = windowId === null ? this._currentWindow : windowTracker.getWindow(windowId, null);
    const dropdown = this._windows.get(w);
    if (dropdown && dropdown.maxHeight !== undefined) {
      return dropdown.maxHeight;
    }
    return w.innerHeight - 140;
  }

  override(url) {
    if (this._overriden) {
      return Promise.reject(new Error('Dropdown is already overriden'));
    }
    const readyPromises = [];
    this._url = url;
    this.onWindowOpened = this._onWindowOpened.bind(this);
    this.onWindowClosed = this._onWindowClosed.bind(this);
    windowTracker.addOpenListener(this.onWindowOpened);
    windowTracker.addCloseListener(this.onWindowClosed);
    for (const window of windowTracker.browserWindows()) {
      readyPromises.push(this.onWindowOpened(window));
    }
    this._overriden = Promise.all(readyPromises);
    return this._overriden;
  }

  get DEFAULT_STATE() {
    return {
      overriden: this.overriden !== null,
      height: 0,
      opened: false,
    };
  }

  getState(window) {
    const dropdown = this._getDropdown(window);
    if (!dropdown || !dropdown.state) {
      return this.DEFAULT_STATE;
    }
    return dropdown.state;
  }

  setState(window, state) {
    const dropdown = (typeof window === 'number' || window === null) ? this._getDropdown(window) : this._windows.get(window);
    if (dropdown) {
      Object.assign(dropdown.state, state);
    }
  }

  restore() {
    if (!this._overriden) {
      throw new ExtensionError('Dropdown is not overriden');
    }
    this.destroy();
  }

  destroy() {
    windowTracker.removeCloseListener(this.onWindowClosed);
    windowTracker.removeOpenListener(this.onWindowOpened);
    for (const [window] of this._windows) {
      this._onWindowClosed(window);
    }
    this._url = null;
    this._overriden = null;
    this._windows.clear();
  }

  _onWindowOpened(window) {
    const dropdown = this._replaceDropdown(window);
    if (dropdown) {
      this._windows.set(window, dropdown);
      return dropdown.readyDefer.promise;
    }
    return Promise.resolve();
  }

  _onWindowClosed(window) {
    const dropdown = this._windows.get(window);
    if (!dropdown) {
      return;
    }
    this._revertDropdown(dropdown);
    this._windows.delete(window);
  }

  updateMaxHeight(window) {
    // update maxHeight
    const dropdown = this._windows.get(window);
    if (dropdown) {
      dropdown.maxHeight = window.innerHeight - 140;
    }
  }

  _replaceDropdown(window) {
    // do not initialize the UI if locationbar is invisible in this window
    if (!window.locationbar.visible) return null;

    const readyDefer = new Defer();
    // create a new panel for cliqz to avoid inconsistencies at FF startup
    const document = window.document;
    const urlbar = window.gURLBar;
    let initialized = false;

    addStylesheet(window.document, this._stylesheetURL);

    const autocompletesearch = urlbar.getAttribute('autocompletesearch');
    urlbar.setAttribute('autocompletesearch', AC_PROVIDER_NAME);
    urlbar.setAttribute('pastetimeout', 0);

    const popup = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'panel');
    // mock default FF function
    popup.enableOneOffSearches = () => {};
    popup.closePopup = () => {};
    popup.richlistbox = {
      children: []
    };
    popup.oneOffSearchButtons = {
      maybeRecordTelemetry() { return false; }
    };
    popup.openAutocompletePopup = () => {};
    popup.setAttribute('id', 'PopupAutoCompleteRichResultCliqz');
    document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

    const autocompletepopup = urlbar.getAttribute('autocompletepopup');
    urlbar.setAttribute('autocompletepopup', 'PopupAutoCompleteRichResultCliqz');

    const disableKeyNavigation = urlbar.disableKeyNavigation;
    urlbar.disableKeyNavigation = true;

    // make CMD/CTRL + K equal with CMD/CTRL + L
    const searchShortcutElements = document.getElementById('mainKeyset').querySelectorAll('#key_search, #key_search2');
    [].forEach.call(searchShortcutElements, (item) => {
      item.setAttribute('original_command', item.getAttribute('command'));
      item.setAttribute('command', 'Browser:OpenLocation');
    });

    // create a browser
    const parentElement = document.getElementById('navigator-toolbox');
    const navToolbar = document.getElementById('nav-bar');

    const browser = document.createElement('browser');
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
    browser.sameProcessAsFrameLoader = this._groupFrameLoader;

    if (this._remote) {
      browser.setAttribute('remote', 'true');
      browser.setAttribute('remoteType', E10SUtils.EXTENSION_REMOTE_TYPE);
    }

    let readyPromise;
    if (this._remote) {
      readyPromise = promiseEvent(browser, 'XULFrameLoaderCreated');
    } else {
      readyPromise = promiseEvent(browser, 'load');
    }

    readyPromise.then(() => {
      const script = `data:text/javascript,(${encodeURI(frameScript)}).call(this)`;
      browser.messageManager.loadFrameScript(script, true, true);
      browser.messageManager.addMessageListener('Dropdown:MessageOut', this);
      readyDefer.resolve();
    });

    const container = document.createElement('div');
    container.appendChild(browser);

    const cliqzToolbar = document.createElement('toolbar');
    cliqzToolbar.setAttribute('fullscreentoolbar', 'true');
    cliqzToolbar.id = 'cliqz-toolbar';
    cliqzToolbar.style.height = '0px';
    cliqzToolbar.appendChild(container);
    parentElement.insertBefore(cliqzToolbar, navToolbar.nextSibling);

    // Create a new stacking context around browser element (it has z-index 100000)
    // so nav-bar element gets higher above on z-axis.
    cliqzToolbar.style.position = 'relative';
    cliqzToolbar.style.zIndex = 1;
    navToolbar.style.zIndex = 2;

    ExtensionParent.apiManager.emit('extension-browser-inserted', browser);
    try {
      browser.loadURI(this._url, { triggeringPrincipal: this._principal });
    } catch (e) {
      browser.loadURI(this._url);
    }

    // Add search history dropdown
    this._reloadUrlbar(urlbar);

    initialized = true;

    const originalUrlbarPlaceholder = this._applyAdditionalThemeStyles(window);
    urlbar.focus();

    return {
      window,
      urlbar,
      popup,
      autocompletesearch,
      autocompletepopup,
      disableKeyNavigation,
      initialized,
      searchShortcutElements,
      originalUrlbarPlaceholder,
      cliqzToolbar,
      browser,
      readyDefer,
      state: this.DEFAULT_STATE
    };
  }

  _revertDropdown(dropdown) {
    const {
      window,
      urlbar,
      popup,
      autocompletesearch,
      autocompletepopup,
      disableKeyNavigation,
      initialized,
      searchShortcutElements,
      originalUrlbarPlaceholder,
      cliqzToolbar,
      browser,
    } = dropdown;

    if (!initialized) return;

    const navToolbar = window.document.getElementById('nav-bar');
    navToolbar.setAttribute('overflowable', 'true');
    navToolbar.style.zIndex = 'auto';

    removeStylesheet(window.document, this._stylesheetURL);

    urlbar.setAttribute('autocompletesearch', autocompletesearch);
    urlbar.setAttribute('autocompletepopup', autocompletepopup);
    urlbar.disableKeyNavigation = disableKeyNavigation;

    // revert onclick handler
    [].forEach.call(searchShortcutElements, (item) => {
      item.setAttribute('command', item.getAttribute('original_command'));
    });

    browser.messageManager.removeMessageListener('Dropdown:MessageOut', this);
    const searchContainer = window.document.getElementById('search-container');
    if (searchContainer) {
      searchContainer.setAttribute('class', searchContainer);
    }
    this._reloadUrlbar(urlbar);
    this._revertAdditionalThemeStyles(window, originalUrlbarPlaceholder);

    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }

    cliqzToolbar.parentNode.removeChild(cliqzToolbar);
  }

  _applyAdditionalThemeStyles(window) {
    const urlbar = window.gURLBar;
    const originalUrlbarPlaceholder = urlbar.mInputField.placeholder;

    urlbar.style.maxWidth = '100%';
    urlbar.style.margin = '0px 0px';

    return originalUrlbarPlaceholder;
  }

  _revertAdditionalThemeStyles(window, originalUrlbarPlaceholder) {
    const urlbar = window.gURLBar;

    urlbar.style.maxWidth = '';
    urlbar.style.margin = '';
    urlbar.mInputField.placeholder = originalUrlbarPlaceholder;
  }

  _reloadUrlbar(urlbar) {
    const el = urlbar;
    const oldVal = el.value;

    if (el && el.parentNode) {
      el.blur();
      el.parentNode.insertBefore(el, el.nextSibling);
      el.value = oldVal;
    }
  }

  async _sendMessage(windowId, payload) {
    if (!this._overriden) {
      throw new ExtensionError('Dropdown is not overriden, no target to send message.');
    }
    await this._overriden;
    const { browser } = this._getDropdown(windowId);
    browser.messageManager.sendAsyncMessage('Dropdown:MessageIn', payload);
  }

  async close(windowId) {
    if (!this._overriden) {
      throw new ExtensionError('Dropdown is not overriden, nothing to close.');
    }
    await this._overriden;
    this.setHeight(windowId, 0);
  }

  async setHeight(windowId, height) {
    if (!this._overriden) {
      throw new ExtensionError('Dropdown is not overriden, cannot change its height.');
    }
    await this._overriden;
    const { browser, window } = this._getDropdown(windowId);
    const newHeight = Math.min(this._getMaxHeight(windowId), height);
    this.setState(windowId, {
      height: newHeight,
      opened: newHeight !== 0,
    });
    const heightInPx = `${newHeight}px`;
    browser.style.height = heightInPx;

    const navToolbar = window.document.getElementById('nav-bar');
    // If newHeight equals 0 then we remove attribute overflowable which results in showing a
    // shadow line under search url bar.
    // Otherwise we need to set this attribute back to nav-bar.
    if (newHeight === 0) {
      navToolbar.setAttribute('overflowable', 'true');
    } else {
      navToolbar.removeAttribute('overflowable');
    }
  }

  _generateEventManager(context, eventName) {
    return new EventManager({
      context,
      name: 'dropdown.onMessage',
      register: (fire) => {
        const listener = (_, window, data) => {
          const details = { data };
          const id = this._getWindowId(window);
          if (context.viewType === 'background') {
            details.windowId = id;
            fire.sync(details);
          }
        };
        this.on(eventName, listener);
        return () => {
          this.off(eventName, listener);
        };
      }
    }).api();
  }

  receiveMessage({ target, data }) {
    return this.emit('message', target.ownerGlobal, data);
  }

  getAPI(context) {
    return {
      override: url => this.override(this._resolveURL(url)),
      restore: () => this.restore(),
      close: windowId => this.close(windowId),
      setHeight: (windowId = null, height) => this.setHeight(windowId, height),
      sendMessage: (windowId = null, payload) => this._sendMessage(windowId, payload),
      onMessage: this._generateEventManager(context, 'message'),
    };
  }
}
