import utils from '../core/utils';
import events from '../core/events';

import { getGreenadsState,
  toggleGreenAdsPref,
  GREENADS_STATE } from './background';
import logger from './logger';


function setBackgroundColor(box, label, value, mode) {
  if (value) {
    label.setAttribute('value', value);
  } else {
    label.setAttribute('value', '');
  }

  if (mode === GREENADS_STATE.GREEN) {
    box.setAttribute('style', 'background-color:#b3e6cc;');
  } else if (mode === GREENADS_STATE.COLLECT) {
    box.setAttribute('style', 'background-color:#ff6666;');
  }
}


function getTabInfo(window) {
  // Extract id of the current tab
  let tabId;
  let url;
  try {
    const gBrowser = window.gBrowser;
    const selectedBrowser = gBrowser.selectedBrowser;
    tabId = selectedBrowser.outerWindowID;
    url = selectedBrowser.currentURI.spec;
  } catch (e) { /* ignore */ }

  return {
    tabId,
    url,
  };
}


function reloadCurrentTab(window) {
  const gBrowser = window.gBrowser;
  gBrowser.reload(0);
}


export default class GreenAds {
  constructor({ window }) {
    this.window = window;
    this.label = null;
    this.timings = new Map();

    this.showButton = utils.getPref('developer', false);
  }

  init() {
    // Only show the button in developer mode
    if (!this.showButton) return;

    // Create UI element in the address bar
    const $ = selector => this.window.document.querySelector(selector);
    const urlbar = $('#urlbar');
    const identityBox = $('#identity-box');
    const createElement = this.window.document.createElement.bind(this.window.document);
    this.box = createElement('box');
    const hbox = createElement('hbox');
    this.label = createElement('label');
    this.label.classList.add('plain');
    hbox.appendChild(this.label);
    this.box.appendChild(hbox);
    this.box.setAttribute('align', 'center');
    urlbar.insertBefore(this.box, identityBox);

    this.box.addEventListener('click', () => {
      try {
        toggleGreenAdsPref();
        const { tabId } = getTabInfo(this.window);
        this.timings.set(tabId, { start: 0, mode: getGreenadsState() });
        this.updateLabel();
      } catch (ex) {
        logger.error(`onClick exception ${ex} ${ex.stack}`);
      }
    });

    this.onReload = events.subscribe('greenads:reloaded', () => {
      const { tabId } = getTabInfo(this.window);
      if (this.timings.has(tabId)) {
        this.timings.delete(tabId);
        utils.setTimeout(
          () => {
            reloadCurrentTab(this.window);
          },
          50,
        );
      }
    });

    // Listen to events: tab changes, load starts, load ends
    this.onStartLoading = events.subscribe('greenads:start_load', (windowTreeInformation, originUrl, timestamp) => {
      const {
        tabId,
        frameId,
      } = windowTreeInformation;

      if (tabId !== frameId) {
        return;
      }

      const state = {
        start: timestamp,
        current: 0,
        cb: null,
        mode: getGreenadsState(),
      };

      this.timings.set(tabId, state);
      state.cb = utils.setInterval(
        () => {
          state.current = Date.now() - state.start;
          this.updateLabel();
        },
        100
      );
      this.updateLabel();
    });

    this.onStopLoading = events.subscribe('greenads:end_load', (windowTreeInformation, originUrl, timestamp) => {
      const {
        tabId,
        frameId,
      } = windowTreeInformation;

      if (!this.timings.has(tabId)) {
        return;
      }

      if (tabId !== frameId) {
        return;
      }

      const { start, cb, mode } = this.timings.get(tabId);
      utils.clearInterval(cb);

      this.timings.set(tabId, {
        start,
        end: timestamp,
        total: timestamp - start,
        mode,
      });
      this.updateLabel();
    });

    this.onTabSelect = events.subscribe('core:tab_select', () => {
      this.updateLabel();
    });
  }

  updateLabel() {
    const { tabId } = getTabInfo(this.window);
    if (this.timings.has(tabId)) {
      const { total, start, current, mode } = this.timings.get(tabId);
      if (total !== undefined) {
        setBackgroundColor(this.box, this.label, `${total} ms`, mode);
      } else if (current !== undefined) {
        setBackgroundColor(this.box, this.label, `${current} ms`, mode);
      } else if (start !== undefined) {
        setBackgroundColor(this.box, this.label, 'loading', mode);
      }
    } else {
      this.label.setAttribute('value', '');
    }
  }

  unload() {
    if (this.box) {
      this.box.parentElement.removeChild(this.box);
      this.box = null;
    }

    // Unsubscribe pref listeners
    if (this.onReload) {
      this.onReload.unsubscribe();
    }
    if (this.onStartLoading) {
      this.onStartLoading.unsubscribe();
    }
    if (this.onStopLoading) {
      this.onStopLoading.unsubscribe();
    }
    if (this.onTabSelect) {
      this.onTabSelect.unsubscribe();
    }
  }
}
