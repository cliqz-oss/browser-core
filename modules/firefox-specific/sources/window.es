import events from '../core/events';
import { Window } from '../core/browser';

const INFO_INTERVAL = 60 * 60 * 1e3; // 1 hour

export default class Win {
  constructor({ window, background }) {
    this.window = window;
    this.background = background;
  }

  init() {
    this.tabSelectEventProxy = events.proxyEvent(
      'core:tab_select',
      this.window.gBrowser.tabContainer,
      'TabSelect',
      false,
      (event) => {
        const tab = event.target;
        const browser = tab.linkedBrowser;
        const win = new Window(tab.ownerGlobal);
        const msg = {
          windowId: win.id,
          url: browser.currentURI.spec,
          tabId: browser.outerWindowID,
          isPrivate: browser.loadContext.usePrivateBrowsing,
        };
        return [msg];
      }
    );

    this.tabCloseEventProxy = events.proxyEvent(
      'core:tab_close',
      this.window.gBrowser.tabContainer,
      'TabClose',
      false,
      (event) => {
        const tab = event.target;
        const browser = tab.linkedBrowser;
        const win = new Window(tab.ownerGlobal);
        const msg = {
          windowId: win.id,
          tabId: browser.outerWindowID,
          isPrivate: browser.loadContext.usePrivateBrowsing,
        };
        return [msg];
      }
    );

    this.tabOpenEventProxy = events.proxyEvent(
      'core:tab_open',
      this.window.gBrowser.tabContainer,
      'TabOpen',
      false,
      (event) => {
        const tab = event.target;
        const browser = tab.linkedBrowser;
        const win = new Window(tab.ownerGlobal);
        const msg = {
          windowId: win.id,
          tabId: browser.outerWindowID,
          isPrivate: browser.loadContext.usePrivateBrowsing,
        };
        return [msg];
      }
    );

    this.whoAmItimer = setInterval(
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
    this.tabCloseEventProxy.unsubscribe();
    this.tabOpenEventProxy.unsubscribe();

    clearInterval(this.whoAmItimer);
  }
}
