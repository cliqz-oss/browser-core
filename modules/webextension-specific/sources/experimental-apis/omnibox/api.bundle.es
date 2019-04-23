/* globals ExtensionAPI */
import URLBar from './urlbarapi';
import Dropdown from './dropdownapi';
import Shortcuts from './shortcutapi';

let omnibox = null;

class Omnibox {
  constructor(extension) {
    this._dropdown = new Dropdown(extension);
    this._urlbar = new URLBar(extension, this._dropdown);
    this._shortcuts = new Shortcuts();
  }

  close() {
    this._urlbar.destroy();
    this._dropdown.destroy();
    this._shortcuts.destroy();
  }

  getAPI(context) {
    const dropdownapi = this._dropdown.getAPI(context);
    const urlbarapi = this._urlbar.getAPI(context);
    const shortcutapi = this._shortcuts.getAPI(context);
    return Object.assign({}, dropdownapi, urlbarapi, shortcutapi);
  }
}

global.omnibox2 = class extends ExtensionAPI {
  getAPI(context) {
    if (!omnibox) {
      omnibox = new Omnibox(context.extension);
      context.extension.callOnClose(omnibox);
    }
    return {
      omnibox2: omnibox.getAPI(context)
    };
  }
};
