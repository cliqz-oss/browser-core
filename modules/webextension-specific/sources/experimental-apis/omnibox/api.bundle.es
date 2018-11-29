/* globals ChromeUtils, ExtensionAPI */
import URLBar from './urlbarapi';
import Dropdown from './dropdownapi';
import Shortcuts from './shortcutapi';

ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
ChromeUtils.import('resource://gre/modules/Services.jsm');

const omniboxGlobal = {};

class Omnibox {
  constructor(context) {
    this._context = context;
    this._dropdown = new Dropdown(context);
    this._urlbar = new URLBar(context, this._dropdown);
    this._shortcuts = new Shortcuts(context);
  }

  destroy() {
    this._urlbar.destroy();
    this._dropdown.destroy();
    this._shortcuts.destroy();
  }

  getAPI() {
    const dropdownapi = this._dropdown.getAPI();
    const urlbarapi = this._urlbar.getAPI();
    const shortcutapi = this._shortcuts.getAPI();
    return Object.assign({}, dropdownapi, urlbarapi, shortcutapi);
  }
}

global.omnibox2 = class extends ExtensionAPI {
  getAPI(context) {
    const { extension } = context;
    omniboxGlobal.extension = extension;
    omniboxGlobal.omnibox = new Omnibox(context);
    return {
      omnibox2: omniboxGlobal.omnibox.getAPI()
    };
  }

  onShutdown() {
    omniboxGlobal.omnibox.destroy();
  }
};
