import utils from '../core/utils';
import prefs from '../core/prefs';
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
    // check for using theme from extension or it exist in browser
    this.useTheme = !this.window.document.documentElement.getAttribute("cliqzBrowser");
    this.actions = {
      addClass: (className) => {
        this.windowNode.classList.add(className);
      },
      removeClass: (className) => {
        this.windowNode.classList.remove(className);
      },
    }

    const theme = prefs.get('freshtab.browserTheme.enabled', false);
    if (theme) {
      this.actions.addClass('cliqz-blue');
    }
  }

  get windowNode() {
    return this.window.document.getElementById('main-window');
  }

  /**
  * @method init
  */
  init() {
    if (this.useTheme) {
      this.moveButtons(this.window.document);
      addStylesheet(this.window.document, this.themeUrl());
    }
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
    if (this.useTheme) {
      removeStylesheet(this.window.document, this.themeUrl());
    }
  }
}
