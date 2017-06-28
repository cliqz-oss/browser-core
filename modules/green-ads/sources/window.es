import utils from '../core/utils';
import events from '../core/events';

import { getGreenadsState
       , toggleGreenAdsPref
       , GREENADS_STATE
       , GREENADS_PREF } from './background';
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


export default class {
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
      } catch (ex) {
        logger.error(`onClick exception ${ex} ${ex.stack}`);
      }
    });

    events.sub('prefchange', (pref) => {
      if (pref !== GREENADS_PREF) return;

      const { tabId } = getTabInfo(this.window);
      if (this.timings.has(tabId)) {
        this.timings.delete(tabId);
        utils.setTimeout(
          () => {
            reloadCurrentTab(this.window);
          },
          0,
        );
      }
    });

    // Listen to events: tab changes, load starts, load ends
    events.sub('chip:start_load', (windowTreeInformation, originUrl, timestamp) => {
      const {
        originWindowID,
        outerWindowID,
      } = windowTreeInformation;

      if (originWindowID !== outerWindowID) {
        return;
      }

      const state = {
        start: timestamp,
        current: 0,
        cb: null,
        mode: getGreenadsState(),
      };

      this.timings.set(originWindowID, state);
      state.cb = utils.setInterval(
        () => {
          state.current += 100;
          this.updateLabel();
        },
        100
      );
      this.updateLabel();
    });

    events.sub('chip:end_load', (windowTreeInformation, originUrl, timestamp) => {
      const {
        originWindowID,
        outerWindowID,
      } = windowTreeInformation;

      if (!this.timings.has(originWindowID)) {
        return;
      }

      if (originWindowID !== outerWindowID) {
        return;
      }

      const { start, cb, mode } = this.timings.get(originWindowID);
      utils.clearInterval(cb);

      this.timings.set(originWindowID, {
        start,
        end: timestamp,
        total: timestamp - start,
        mode,
      });
      this.updateLabel();
    });

    events.sub('core:tab_select', () => {
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
  }
}
