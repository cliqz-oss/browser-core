/* global ChromeUtils, ExtensionCommon */
import BrowserDropdown from '../../../platform-firefox/omnibox/dropdown';

ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
const { EventManager } = ExtensionCommon;

export default class Dropdown extends BrowserDropdown {
  constructor(context) {
    const { remote, principal, groupFrameLoader } = context.extension;
    super({
      remote,
      principal,
      groupFrameLoader,
    });
    this._context = context;
  }

  _resolveURL(url) {
    return this._context.extension.baseURI.resolve(url);
  }

  _generateEventManager(eventName) {
    return new EventManager(this._context, 'dropdown.onMessage', (fire) => {
      const listener = (_, window, data) => {
        const details = { data };
        const id = this._getWindowId(window);
        if (this._context.viewType === 'background') {
          details.windowId = id;
          fire.async(details);
        }
      };
      this.on(eventName, listener);
      return () => {
        this.off(eventName, listener);
      };
    }).api();
  }
}
