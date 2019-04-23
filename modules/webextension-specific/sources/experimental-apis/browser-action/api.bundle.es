/* globals ChromeUtils, DefaultWeakMap */
const { ExtensionCommon } = ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
const { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { EventEmitter } = ChromeUtils.import('resource://gre/modules/EventEmitter.jsm');
const { CustomizableUI } = ChromeUtils.import('resource:///modules/CustomizableUI.jsm', {});

const browserAreas = {
  navbar: CustomizableUI.AREA_NAVBAR,
  menupanel: CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
  tabstrip: CustomizableUI.AREA_TABSTRIP,
  personaltoolbar: CustomizableUI.AREA_BOOKMARKS,
};

const { EventManager } = ExtensionCommon;
const { Management: { global: { windowTracker, tabTracker } } } = ChromeUtils.import('resource://gre/modules/Extension.jsm', null);
const {
  IconDetails,
  StartupCache,
} = ExtensionParent;

const makeWidgetId = id => id.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

/**
 * Manages tab-specific and window-specific context data, and dispatches
 * tab select events across all windows.
 *
 * Copypasted from https://github.com/mozilla/gecko-dev/blob/master/browser/components/extensions/parent/ext-browser.js#L136
 * ESlint disabled for easier tracking changes
 */
/* eslint-disable */
const TabContext = class extends EventEmitter {
  /**
   * @param {Function} getDefaultPrototype
   *        Provides the prototype of the context value for a tab or window when there is none.
   *        Called with a XULElement or ChromeWindow argument.
   *        Should return an object or null.
   */
  constructor(getDefaultPrototype) {
    super();

    this.getDefaultPrototype = getDefaultPrototype;

    this.tabData = new WeakMap();

    windowTracker.addListener("progress", this);
    windowTracker.addListener("TabSelect", this);

    this.tabAdopted = this.tabAdopted.bind(this);
    tabTracker.on("tab-adopted", this.tabAdopted);
  }

  /**
   * Returns the context data associated with `keyObject`.
   *
   * @param {XULElement|ChromeWindow} keyObject
   *        Browser tab or browser chrome window.
   * @returns {Object}
   */
  get(keyObject) {
    if (!this.tabData.has(keyObject)) {
      let data = Object.create(this.getDefaultPrototype(keyObject));
      this.tabData.set(keyObject, data);
    }

    return this.tabData.get(keyObject);
  }

  /**
   * Clears the context data associated with `keyObject`.
   *
   * @param {XULElement|ChromeWindow} keyObject
   *        Browser tab or browser chrome window.
   */
  clear(keyObject) {
    this.tabData.delete(keyObject);
  }

  handleEvent(event) {
    if (event.type == "TabSelect") {
      let nativeTab = event.target;
      this.emit("tab-select", nativeTab);
      this.emit("location-change", nativeTab);
    }
  }

  onLocationChange(browser, webProgress, request, locationURI, flags) {
    if (!webProgress.isTopLevel) {
      // Only pageAction and browserAction are consuming the "location-change" event
      // to update their per-tab status, and they should only do so in response of
      // location changes related to the top level frame (See Bug 1493470 for a rationale).
      return;
    }
    let gBrowser = browser.ownerGlobal.gBrowser;
    let tab = gBrowser.getTabForBrowser(browser);
    // fromBrowse will be false in case of e.g. a hash change or history.pushState
    let fromBrowse = !(flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT);
    this.emit("location-change", tab, fromBrowse);
  }

  /**
   * Persists context data when a tab is moved between windows.
   *
   * @param {string} eventType
   *        Event type, should be "tab-adopted".
   * @param {NativeTab} adoptingTab
   *        The tab which is being opened and adopting `adoptedTab`.
   * @param {NativeTab} adoptedTab
   *        The tab which is being closed and adopted by `adoptingTab`.
   */
  tabAdopted(eventType, adoptingTab, adoptedTab) {
    if (!this.tabData.has(adoptedTab)) {
      return;
    }
    // Create a new object (possibly with different inheritance) when a tab is moved
    // into a new window. But then reassign own properties from the old object.
    let newData = this.get(adoptingTab);
    let oldData = this.tabData.get(adoptedTab);
    this.tabData.delete(adoptedTab);
    Object.assign(newData, oldData);
  }

  /**
   * Makes the TabContext instance stop emitting events.
   */
  shutdown() {
    windowTracker.removeListener("progress", this);
    windowTracker.removeListener("TabSelect", this);
    tabTracker.off("tab-adopted", this.tabAdopted);
  }
};
/* eslint-enable */

// global functions required to `ext-browserAction.js` execute correctly
global.makeWidgetId = makeWidgetId;
global.EventManager = EventManager;
global.windowTracker = windowTracker;
global.tabTracker = tabTracker;
global.TabContext = TabContext;

// Now execute `ext-browserAction.js` in the current scope
// in order to get access to original BrowserAction constructor
Services.scriptloader.loadSubScript('chrome://browser/content/parent/ext-browserAction.js', global, 'UTF-8');

const BrowserAction = global.browserAction;
delete global.browserAction;

global.browserAction2 = class extends BrowserAction {
  constructor(...args) {
    super(...args);
    this._isReady = new Promise((resolve) => {
      this._ready = resolve;
    });
  }

  async create(options) {
    const { extension } = this;

    this.iconData = new DefaultWeakMap(icons => this.getIconData(icons));

    const widgetId = makeWidgetId(extension.id);
    this.id = `${widgetId}-browser-action2`;
    this.viewId = `PanelUI-webext-${widgetId}-browser-action-view2`;
    this.widget = null;

    this.pendingPopup = null;
    this.pendingPopupTimeout = null;
    this.eventQueue = [];

    this.tabManager = extension.tabManager;

    this.defaults = {
      enabled: true,
      title: options.default_title || extension.name,
      badgeText: '',
      badgeBackgroundColor: [0xd9, 0, 0, 255],
      badgeDefaultColor: [255, 255, 255, 255],
      badgeTextColor: null,
      popup: (options.default_popup && extension.baseURI.resolve(options.default_popup)) || '',
      area: browserAreas[options.default_area || 'navbar'],
    };
    this.globals = Object.create(this.defaults);

    this.browserStyle = options.browser_style;

    this.defaults.icon = await StartupCache.get(
      extension, ['browserAction2', 'default_icon'],
      () => IconDetails.normalize({
        path: options.default_icon,
        iconType: 'browserAction2',
        themeIcons: options.theme_icons,
      }, extension)
    );

    this.iconData.set(
      this.defaults.icon,
      await StartupCache.get(
        extension, ['browserAction2', 'default_icon_data'],
        () => this.getIconData(this.defaults.icon)
      )
    );

    this.tabContext = new TabContext((target) => {
      const window = target.ownerGlobal;
      if (target === window) {
        return this.globals;
      }
      return this.tabContext.get(window);
    });

    // eslint-disable-next-line mozilla/balanced-listeners
    this.tabContext.on('location-change', this.handleLocationChange.bind(this));

    this.build();
    this._ready();
  }

  wrapOriginalAPI(api) {
    return Object.keys(api).reduce((wrappedAPI, prop) => {
      if (typeof api[prop] === 'function') {
        wrappedAPI[prop] = async (...args) => { // eslint-disable-line
          await this._isReady;
          return api[prop](...args);
        };
      } else {
        wrappedAPI[prop] = api[prop]; // eslint-disable-line
      }
      return wrappedAPI;
    }, Object.create(null));
  }

  getAPI(context) {
    const originalAPI = super.getAPI(context);
    return {
      browserAction2: Object.assign(this.wrapOriginalAPI(originalAPI.browserAction), {
        create: options => this.create(options),
      })
    };
  }
};
