import inject from '../core/kord/inject';
import prefs from '../core/prefs';
import { newTab } from '../platform/tabs';
import { PREF_GREP /* , URL_DUMMY */ } from './consts';
import { chrome } from '../platform/globals';

export default class Win {
  deps = {
    core: inject.module('core'),
  };

  async init() {
    const grep = prefs.get(PREF_GREP, '');
    const url = chrome.runtime.getURL(`/modules/chromium-tests/test.html?grep=${grep}`);
    newTab(url, true);

    /*
    // open dummy page that is not extension page so on extension reload
    // browser wont be closed in case test page was the last tab open
    newTab(URL_DUMMY);

    // kill dummies if there are more than one
    setTimeout(
      () => chrome.tabs.query({}, (tabs) => {
        const dummyTabs = tabs.filter(t => t.url === URL_DUMMY);
        chrome.tabs.remove(dummyTabs.map(t => t.id).slice(1));
      }),
      1000,
    );
    */
  }

  unload() {
  }
}
