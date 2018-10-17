/* globals ChromeUtils */
const { EventManager } = ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm', null).ExtensionCommon;
const EventEmitter = ChromeUtils.import('resource://gre/modules/EventEmitter.jsm', null).EventEmitter;
const { Management: { global: { windowTracker, tabTracker } } } = ChromeUtils.import('resource://gre/modules/Extension.jsm', {});

const SHORTCUT_BOX_ID = 'cliqzShortcutBox';

const getWindowId = window => windowTracker.getId(window);

const getActiveTabId = window => tabTracker.getId(window.gBrowser.selectedTab);

class Shortcut extends EventEmitter {
  constructor(window, windowId, context) {
    super();
    this.window = window;
    this.id = windowId;

    this.onClicked = new EventManager({
      context,
      name: 'shortcut.onClicked',
      inputHandling: true,
      register: (fire) => {
        const listener = (event, data) => {
          fire.sync(data);
        };
        this.on('click', listener);
        return () => {
          this.off('click', listener);
        };
      },
    }).api();

    this.addTabEventListener();
    this.addURLBarEventListener();

    this.showingQueries = new Map();

    this.shortcutBox = this.window.document.createElement('hbox');
    this.container = this.window.document.createElement('hbox');
    this.container.id = SHORTCUT_BOX_ID;

    this.container.addEventListener('click', this.handleOnClicked);
    this.container.appendChild(this.shortcutBox);
  }

  attach() {
    const $targetPosition = this.window.gURLBar.mInputField.parentElement;
    $targetPosition.insertBefore(this.container, $targetPosition.firstChild);
  }

  unload() {
    this.showingQueries.clear();
    this.container.removeEventListener('click', this.handleOnClicked);
    try {
      this.container.parentNode.removeChild(this.container);
    } catch (e) {
      // removed already, maybe by some other browser feature
    }
    this.removeTabEventListener();
    this.removeURLBarEventListener();
  }

  handleOnClicked = () => this.emit('click', {
    windowId: this.id,
    text: this.currentText,
  })

  handleTabEvent = (event) => {
    const tabId = tabTracker.getId(event.target);

    if (event.type === 'TabOpen') {
      this.hide();
      return; // Since open event and select event are fired together
    }

    if (event.type === 'TabClose') {
      this.clear(tabId);
    }

    if (event.type === 'TabSelect') {
      this.hide();
      this.showShortcut(tabId);
    }
  }

  handleURLBarEvent = (event) => {
    if (event.type === 'focus') {
      this.hide();
    }

    if (event.type === 'blur') {
      this.showShortcut(getActiveTabId(this.window));
    }
  }

  addTabEventListener() {
    ['TabOpen', 'TabClose', 'TabSelect'].forEach((event) => {
      this.window.gBrowser.tabContainer.addEventListener(event, this.handleTabEvent);
    });
  }

  removeTabEventListener() {
    ['TabOpen', 'TabClose', 'TabSelect'].forEach((event) => {
      this.window.gBrowser.tabContainer.removeEventListener(event, this.handleTabEvent);
    });
  }

  addURLBarEventListener() {
    ['focus', 'blur'].forEach((event) => {
      this.window.gURLBar.addEventListener(event, this.handleURLBarEvent);
    });
  }

  removeURLBarEventListener() {
    ['focus', 'blur'].forEach((event) => {
      this.window.gURLBar.removeEventListener(event, this.handleURLBarEvent);
    });
  }

  show(text) {
    if (!this.window.gURLBar.mInputField.parentElement.querySelector(`#${SHORTCUT_BOX_ID}`)) {
      this.attach();
    }

    this.currentText = text;
    this.shortcutBox.textContent = text;
    this.shortcutBox.tooltipText = text;
    this.container.style.display = 'flex';
  }

  hide() {
    this.container.style.display = 'none';
  }

  update(tabId, text) {
    this.showingQueries.set(tabId, text);
  }

  clear(tabId) {
    this.showingQueries.delete(tabId);
  }

  showShortcut(tabId) {
    const text = this.showingQueries.get(tabId);
    if (text) {
      this.show(text);
    }
  }
}

export default class Shortcuts extends EventEmitter {
  constructor(context) {
    super();
    this.context = context;
  }

  handleEvent = (data) => {
    this.emit('click', data);
  }

  getShortcutFromWindowId(windowId, context, forceCreate) {
    let shortcut;

    if (windowId) { // If windowId is specified, look up only
      shortcut = this.shortcutInstances.find(_shortcut => _shortcut.id === windowId);
      if (!shortcut) {
        return null;
      }
    } else { // If windowId is not specified, get current window instead
      const window = windowTracker.getCurrentWindow();
      const winId = getWindowId(window);
      shortcut = this.shortcutInstances.find(_shortcut => _shortcut.id === winId);
      if (!shortcut && forceCreate) { // If there is no existing shortcut instance, create one
        shortcut = new Shortcut(window, winId, context);
        this.shortcutInstances.push(shortcut);
        shortcut.onClicked.addListener(this.handleEvent);
      }
    }

    return shortcut;
  }

  getAPI() {
    const context = this.context;
    this.shortcutInstances = [];

    return {
      urlbarAction: {
        onClicked: new EventManager({
          context,
          name: 'shortcuts.onClicked',
          inputHandling: true,
          register: (fire) => {
            const listener = (event, data) => {
              fire.sync(data);
            };
            this.on('click', listener);
            return () => {
              this.off('click', listener);
            };
          },
        }).api(),

        show: ({ text, tabId, windowId }) => {
          if (!text) {
            return;
          }

          const shortcut = this.getShortcutFromWindowId(windowId, context, true);
          if (!shortcut) {
            return;
          }

          const activeTabId = getActiveTabId(shortcut.window);

          if (tabId) { // If tabId is specified
            shortcut.update(tabId, text);
            if (tabId === activeTabId) {
              shortcut.show(text);
            }
          } else { // If not, use active tab id instead
            shortcut.update(activeTabId, text);
            shortcut.show(text);
          }
        },

        hide: ({ tabId, windowId }) => {
          const shortcut = this.getShortcutFromWindowId(windowId, context);
          if (!shortcut) {
            return;
          }

          const activeTabId = getActiveTabId(shortcut.window);

          if (tabId) { // If tabId is specified
            shortcut.clear(tabId);
            if (tabId === activeTabId) {
              shortcut.hide();
            }
          } else { // If not, use active tab id instead
            shortcut.clear(activeTabId);
            shortcut.hide();
          }
        }
      }
    };
  }

  destroy() {
    this.shortcutInstances.forEach((shortcut) => {
      shortcut.onClicked.removeListener(this.handleEvent);
      shortcut.unload();
    });
  }
}
