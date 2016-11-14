import utils from '../core/utils';
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";

/**
* @namespace theme
*/
export default class {
  /**
  * @class Theme
  * @constructor
  */

  constructor(settings) {
    this.window = settings.window;
  }

  /**
  * @method init
  */
  init() {
    this.moveButtons(this.window.document);
    addStylesheet(this.window.document, this.themeUrl());
  }

  themeUrl() {
    let url;
    if (utils.isWindows()) {
      url = 'chrome://cliqz/content/theme/styles/theme-win.css';
    } else if (utils.isMac()) {
      url = 'chrome://cliqz/content/theme/styles/theme-mac.css';
    } else if (utils.isLinux()) {
      url = 'chrome://cliqz/content/theme/styles/theme-linux.css';
    }
    return url;
  }

  moveButtons(document) {
    const frwBtn = document.getElementById('forward-button');
    const urlbarContainer = document.getElementById('urlbar-container');
    const urlbarWrapper = document.getElementById('urlbar-wrapper');
    urlbarContainer.insertBefore(frwBtn, urlbarWrapper);
  }

  unload() {
    removeStylesheet(this.window.document, this.themeUrl());
  }
}
