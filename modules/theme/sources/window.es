import utils from '../core/utils';
import prefs from '../core/prefs';
import console from '../core/console';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import inject from '../core/kord/inject';
import { isPlatformAtLeastInVersion } from '../core/platform';
import config from '../core/config';

const DEVELOPER_FLAG_PREF = 'developer';
const BLUE_THEME_PREF  = 'freshtab.blueTheme.enabled';
const FRESHTAB_CONFIG_PREF = 'freshtabConfig';

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
    this.useTheme = !this.window.document.documentElement.getAttribute('cliqzBrowser');
    this.theme = inject.module('theme');
    this.actions = {
      addClass: this.addClass.bind(this),
      removeClass: this.removeClass.bind(this)
    };
    if (prefs.get(DEVELOPER_FLAG_PREF, false)) {
      this.toggleBlueThemeForFFTesting();
    }
  }

  get windowNode() {
    return this.window.document.getElementById('main-window');
  }

  toggleBlueThemeForFFTesting() {
    const config = prefs.getObject(FRESHTAB_CONFIG_PREF);
    const background = config.background || {};
    
    if (prefs.get(BLUE_THEME_PREF, false) || !Object.keys(background).length) {
      this.theme.action('addBlueClass');
      prefs.set(BLUE_THEME_PREF, true);
    }
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
    const ff57 = isPlatformAtLeastInVersion('57.0') ? 'ff57-' : '';
    if (utils.isWindows()) {
      url = `${config.baseURL}theme/styles/${ff57}theme-win.css`;
    } else if (utils.isMac()) {
      url = `${config.baseURL}theme/styles/${ff57}theme-mac.css`;
    } else if (utils.isLinux()) {
      url = `${config.baseURL}theme/styles/${ff57}theme-linux.css`;
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

  addClass(className) {
    this.windowNode.classList.add(className);
  }

  removeClass(className) {
    this.windowNode.classList.remove(className);
  }
}
