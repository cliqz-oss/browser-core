/* globals ChromeUtils, ExtensionCommon,
           EventEmitter, CustomizableUI, ExtensionParent, DefaultWeakMap */
ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');
ChromeUtils.import('resource://gre/modules/Services.jsm');
ChromeUtils.import('resource://gre/modules/EventEmitter.jsm');
ChromeUtils.import('resource:///modules/CustomizableUI.jsm');

const browserAreas = {
  navbar: CustomizableUI.AREA_NAVBAR,
  menupanel: CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
  tabstrip: CustomizableUI.AREA_TABSTRIP,
  personaltoolbar: CustomizableUI.AREA_BOOKMARKS,
};

const { makeWidgetId, EventManager } = ExtensionCommon;
const { Management: { global: { windowTracker, tabTracker } } } = ChromeUtils.import('resource://gre/modules/Extension.jsm', {});
const {
  IconDetails,
  StartupCache,
} = ExtensionParent;

/**
 * Manages tab-specific and window-specific context data, and dispatches
 * tab select events across all windows.
 *
 * Copypasted from https://github.com/mozilla/gecko-dev/blob/master/browser/components/extensions/parent/ext-browser.js#L136
 */
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

    windowTracker.addListener('progress', this);
    windowTracker.addListener('TabSelect', this);

    this.tabAdopted = this.tabAdopted.bind(this);
    tabTracker.on('tab-adopted', this.tabAdopted);
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
      const data = Object.create(this.getDefaultPrototype(keyObject));
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
    if (event.type === 'TabSelect') {
      const nativeTab = event.target;
      this.emit('tab-select', nativeTab);
      this.emit('location-change', nativeTab);
    }
  }

  onLocationChange(browser, webProgress, request, locationURI, flags) {
    const gBrowser = browser.ownerGlobal.gBrowser;
    const tab = gBrowser.getTabForBrowser(browser);
    // fromBrowse will be false in case of e.g. a hash change or history.pushState
    // eslint-disable-next-line
    const fromBrowse = !(flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT);
    this.emit('location-change', tab, fromBrowse);
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
    const newData = this.get(adoptingTab);
    const oldData = this.tabData.get(adoptedTab);
    this.tabData.delete(adoptedTab);
    Object.assign(newData, oldData);
  }

  /**
   * Makes the TabContext instance stop emitting events.
   */
  shutdown() {
    windowTracker.removeListener('progress', this);
    windowTracker.removeListener('TabSelect', this);
    tabTracker.off('tab-adopted', this.tabAdopted);
  }
};

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
      popup: options.default_popup || '',
      area: browserAreas[options.default_area || 'navbar'],
    };
    this.globals = Object.create(this.defaults);

    this.browserStyle = options.browser_style;

    this.defaults.icon = await StartupCache.get(
      extension, ['browserAction2', 'default_icon'],
      () => IconDetails.normalize({
        path: options.default_icon,
        iconType: 'browserAction',
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
  }

  getAPI(context) {
    const originalAPI = super.getAPI(context);
    return {
      browserAction2: Object.assign(originalAPI.browserAction, {
        create: options => this.create(options),
      })
    };
  }
};
