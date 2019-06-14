/* globals ChromeUtils, windowTracker, tabTracker */
import { PASSIVE_LISTENER_OPTIONS } from '../../../dropdown/managers/utils';

const { EventEmitter } = ChromeUtils.import('resource://gre/modules/EventEmitter.jsm');
const LAST_QUERY_BOX_ID = 'cliqzLastQueryBox';
const getWindowId = window => windowTracker.getId(window);
const getActiveTabId = window => tabTracker.getId(window.gBrowser.selectedTab);

export default class LastQuery extends EventEmitter {
  showingQueries = new Map();

  attached = false;

  constructor(window) {
    super();
    this.window = window;
    this.id = getWindowId(window);
  }

  attach() {
    this.lastQueryBox = this.window.document.createElement('hbox');
    this.container = this.window.document.createElement('hbox');
    this.container.id = LAST_QUERY_BOX_ID;
    this.container.appendChild(this.lastQueryBox);
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
        this.showLastQuery(tabId);
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
    this.lastQueryBox.textContent = text;
    this.lastQueryBox.tooltipText = text;
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

  showLastQuery(tabId) {
    const text = this.showingQueries.get(tabId);
    if (text) {
      this.show(text);
    } else {
      this.hide();
    }
  }

  hideLastQuery(tabId) {
    const { id, active } = this.getTab(tabId);
    if (active) {
      this.clear(id);
    }
    this.hide();
  }
}
