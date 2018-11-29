/* global ChromeUtils, ExtensionCommon */
import BrowserURLBar from '../../../platform-firefox/omnibox/urlbar';

ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
const { EventManager } = ExtensionCommon;

export default class URLBar extends BrowserURLBar {
  constructor(context, dropdown) {
    super(dropdown);
    this._context = context;
  }

  /**
   * Generates a EventManager for given eventName and context.
   * Available only in background context.
   *
   * @param  {string} eventName
   * @return {function}
   */
  _generateEventManager(eventName) {
    const name = eventName[0].toUpperCase() + eventName.slice(1);

    return new EventManager(this._context, `urlbar.on${name}`, (fire) => {
      const listener = (_, window, details = {}) => {
        if (this._context.viewType === 'background') {
          fire.async({
            ...details,
            windowId: this._getWindowId(window),
          });
        }
      };
      this.on(eventName, listener);
      return () => {
        this.off(eventName, listener);
      };
    }).api();
  }
}
