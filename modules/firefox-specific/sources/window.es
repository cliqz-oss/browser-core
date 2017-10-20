import Redirect from './redirect';
import utils from '../core/utils';
import events from '../core/events';
import { Window } from '../core/browser';

const INFO_INTERVAL = 60 * 60 * 1e3; // 1 hour

export default class {
  constructor({ window, background }) {
    this.window = window;
    this.background = background;
  }

  init() {
    this.tabSelectEventProxy = events.proxyEvent(
      'core:tab_select',
      this.window.gBrowser.tabContainer,
      'TabSelect',
      undefined,
      function (event) {
        const tab = event.target;
        const browser = tab.linkedBrowser;
        const win = new Window(tab.ownerGlobal);
        const msg = {
          windowId: win.id,
          url: browser.currentURI.spec,
          isPrivate: browser.loadContext.usePrivateBrowsing,
        };
        return [msg];
      }
    );

    Redirect.addHttpObserver();


    this.whoAmItimer = utils.setInterval(
      this.whoAmI.bind(this, { startup: false }),
      INFO_INTERVAL
    );

    return this.whoAmI({ startup: true });
  }

  whoAmI({ startup }) {
    const win = new Window(this.window);
    this.background.whoAmI({
      startup,
      windowId: win.id,
    });
  }

  unload() {
    // Unsubsribe event proxies
    this.tabSelectEventProxy.unsubscribe();
    Redirect.unload();

    utils.clearInterval(this.whoAmItimer);
  }

}
