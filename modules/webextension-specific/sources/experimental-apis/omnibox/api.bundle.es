/* globals ChromeUtils, ExtensionAPI */
import URLBar from './urlbarapi';
import Dropdown from './dropdownapi';

ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
ChromeUtils.import('resource://gre/modules/Services.jsm');

const omniboxGlobal = {};

class Omnibox {
  constructor(context) {
    this._context = context;
    this._dropdown = new Dropdown(context);
    this._urlbar = new URLBar(context, this._dropdown);
  }

  destroy() {
    this._urlbar.destroy();
    this._dropdown.destroy();
  }

  getAPI() {
    const dropdownapi = this._dropdown.getAPI();
    const urlbarapi = this._urlbar.getAPI();
    return Object.assign({}, dropdownapi, urlbarapi);
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
