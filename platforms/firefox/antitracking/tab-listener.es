import { isWindowActive } from 'platform/browser';
import { events } from 'core/cliqz';

const tabsStatus = {};
const cleanInterval = 1000 * 60 * 2;
let lastClean = Date.now();

function onStateChange({urlSpec, isNewPage, windowID}) {
  // check flags for started request
  if (isNewPage && urlSpec && windowID && urlSpec.startsWith('http')) {
    // add window -> url pair to tab cache.
    tabsStatus[windowID] = urlSpec;
  }
  if (Date.now() - lastClean > cleanInterval) {
    cleanTabsStatus();
    lastClean = Date.now();
  }
};

export function init() {
  events.sub("core.tab_state_change", onStateChange);
}

export function unload() {
  events.un_sub("core.tab_state_change", onStateChange);
}

// Get an array of windowIDs for tabs which a currently on the given URL.
export function getTabsForURL(url) {
  var tabs = [];
  for(var windowID in tabsStatus) {
    var tabURL = tabsStatus[windowID];
    if (url == tabURL || url == tabURL.split('#')[0]) {
      tabs.push(windowID);
    }
  }
  return tabs;
};

function cleanTabsStatus() {
  for (let tabId of Object.keys(tabsStatus)) {
    if (!isWindowActive(tabId)) {
      delete tabsStatus[tabId];
    }
  }
};
