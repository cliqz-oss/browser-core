/* globals ChromeUtils, windowTracker, tabTracker, EventManager, EventEmitter, ExtensionParent */
ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');

const { ExtensionError } = ExtensionParent;
const SHORTCUT_BOX_ID = 'cliqzShortcutBox';
const getWindowId = window => windowTracker.getId(window);
const getActiveTabId = window => tabTracker.getId(window.gBrowser.selectedTab);
const PASSIVE_LISTENER_OPTIONS = {
  passive: true,
  mozSystemGroup: true,
};

class Shortcut extends EventEmitter {
  showingQueries = new Map();

  attached = false;

  constructor(window) {
    super();
    this.window = window;
    this.id = getWindowId(window);
  }

  attach() {
    this.shortcutBox = this.window.document.createElement('hbox');
    this.container = this.window.document.createElement('hbox');
    this.container.id = SHORTCUT_BOX_ID;
    this.container.appendChild(this.shortcutBox);
    const $targetPosition = this.window.gURLBar.mInputField.parentElement;
    $targetPosition.insertBefore(this.container, $targetPosition.firstChild);
    this.addEventListeners();
    this.attached = true;
  }

  unload() {
    this.showingQueries.clear();
    if (this.attached) {
      this.removeEventListeners();
      this.container.parentNode.removeChild(this.container);
    }
  }

  handleEvent(event) {
    switch (event.type) {
      case 'focus': {
        this.hide();
        break;
      }
      case 'TabClose': {
        const tabId = tabTracker.getId(event.target);
        this.clear(tabId);
        break;
      }
      case 'blur':
      case 'TabSelect': {
        const tabId = getActiveTabId(event.target.ownerGlobal);
        this.hide();
        this.showShortcut(tabId);
        break;
      }
      case 'click': {
        this.emit('click', {
          windowId: this.id,
          tabId: getActiveTabId(this.window),
          text: this.currentText,
        });
        break;
      }
      default:
        break;
    }
  }

  addEventListeners() {
    ['TabClose', 'TabSelect'].forEach((event) => {
      this.window.gBrowser.tabContainer.addEventListener(event, this, PASSIVE_LISTENER_OPTIONS);
    });
    ['focus', 'blur'].forEach((event) => {
      this.window.gURLBar.addEventListener(event, this, PASSIVE_LISTENER_OPTIONS);
    });
    this.container.addEventListener('click', this, PASSIVE_LISTENER_OPTIONS);
  }

  removeEventListeners() {
    ['TabOpen', 'TabClose', 'TabSelect'].forEach((event) => {
      this.window.gBrowser.tabContainer.removeEventListener(event, this, PASSIVE_LISTENER_OPTIONS);
    });
    ['focus', 'blur'].forEach((event) => {
      this.window.gURLBar.removeEventListener(event, this, PASSIVE_LISTENER_OPTIONS);
    });
    this.container.removeEventListener('click', this, PASSIVE_LISTENER_OPTIONS);
  }

  show(text) {
    if (!this.attached) {
      this.attach();
    }
    this.currentText = text;
    this.shortcutBox.textContent = text;
    this.shortcutBox.tooltipText = text;
    this.container.style.display = 'flex';
  }

  getTab(tabId) {
    let id = tabId;
    const activeTabId = getActiveTabId(this.window);
    if (typeof id !== 'number') {
      id = activeTabId;
    }
    return {
      id,
      active: id === activeTabId,
    };
  }

  hide() {
    this.container.style.display = 'none';
  }

  update(tabId, text) {
    const { id, active } = this.getTab(tabId);
    this.showingQueries.set(id, text);
    if (active) {
      this.show(text);
    }
  }

  clear(tabId) {
    this.showingQueries.delete(tabId);
  }

  showShortcut(tabId) {
    const text = this.showingQueries.get(tabId);
    if (text) {
      this.show(text);
    } else {
      this.hide();
    }
  }
}

const shortcuts = new Map();

export default class Shortcuts extends EventEmitter {
  handleEvent = (_, data) => this.emit('click', data);

  shortcutInstances = new Map();

  getWindowByTabId(_tabId) {
    let window;
    let tabId = _tabId;
    if (!_tabId) {
      window = windowTracker.getCurrentWindow();
      tabId = getActiveTabId(window);
    } else {
      const tab = tabTracker.getTab(tabId);
      if (!tab) {
        throw new ExtensionError(`Cannot find tab with ID ${tabId}`);
      }
      window = tab.ownerGlobal;
    }
    return window;
  }

  getShortcutByTabId(tabId, forceCreate = false) {
    const window = this.getWindowByTabId(tabId);
    let shortcut = this.shortcutInstances.get(window);
    if (!shortcut && forceCreate) {
      shortcut = new Shortcut(window);
      shortcut.on('click', this.handleEvent);
      this.shortcutInstances.set(window, shortcut);
    }
    return shortcut;
  }

  getAPI(context) {
    return {
      urlbarAction: {
        onClicked: new EventManager({
          context,
          name: 'shortcuts.onClicked',
          inputHandling: true,
          register: (fire) => {
            const listener = (_, data) => {
              fire.sync(data);
            };
            this.on('click', listener);
            return () => {
              this.off('click', listener);
            };
          },
        }).api(),

        show: ({ text, tabId }) => {
          const shortcut = this.getShortcutByTabId(tabId, true);
          shortcut.update(tabId, text);
        },

        hide: ({ tabId }) => {
          const shortcut = this.getShortcutByTabId(tabId);
          if (!shortcut) {
            return;
          }

          const { id, active } = shortcut.getTab(tabId);
          if (active) {
            shortcut.clear(id);
          }
          shortcut.hide();
        }
      }
    };
  }

  destroy() {
    for (const window of windowTracker.browserWindows()) {
      const shortcut = this.shortcutInstances.get(window);
      if (shortcut) {
        shortcut.off('click', this.handleEvent);
        shortcut.unload();
      }
    }
    shortcuts.clear();
  }
}
