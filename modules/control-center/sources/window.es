/* eslint-disable no-param-reassign */
import utils from '../core/utils';
import prefs from '../core/prefs';
import { getMessage } from '../core/i18n';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import { isBootstrap } from '../core/platform';
import config from './config';

const STYLESHEET_URL = 'chrome://cliqz/content/control-center/styles/xul.css';
const TRIQZ_URL = config.settings.TRIQZ_URL;

export default class Win {
  toolbarActions = {
    resize: ({ width, height }) => {
      if (this.toolbarButton) {
        this.toolbarButton.resizePopup(this.window, { width, height });
      }

      if (this.pageAction) {
        this.pageAction.resizePopup(this.window, { width, height });
      }
    }
  }

  constructor({ window, background, settings }) {
    this.window = window;
    this.background = background;
    this.toolbarButton = this.background.toolbarButton;
    this.pageAction = this.background.pageAction;

    this.settings = settings;
    this.channel = settings.channel;
    this.ICONS = settings.ICONS;
    this.BACKGROUNDS = settings.BACKGROUNDS;

    if (isBootstrap) {
      this.createFFhelpMenu = this.createFFhelpMenu.bind(this);
      this.helpMenu = window.document.getElementById('menu_HelpPopup');
    }
  }

  init() {
    addStylesheet(this.window.document, STYLESHEET_URL);

    if (prefs.get('toolbarButtonPositionSet', false) === false && this.toolbarButton) {
      this.toolbarButton.setPositionBeforeElement('bookmarks-menu-button');
      prefs.set('toolbarButtonPositionSet', true);
    }

    this.updateFFHelpMenu();

    if (this.toolbarButton) {
      this.toolbarButton.addWindow(this.window, this.toolbarActions);
    }

    if (this.pageAction) {
      this.pageAction.addWindow(this.window, this.toolbarActions);

      const pageActionBox = this.window.document.getElementById('page-action-buttons');
      const pageActionBtn = this.window.document.getElementById(this.pageAction.id);
      pageActionBox.prepend(pageActionBtn);
      // by default the pageActionBtn is hidden with display:none
      pageActionBtn.style.removeProperty('display');
    }
  }

  updateFFHelpMenu() {
    if (this.helpMenu && this.settings.helpMenus) {
      this.helpMenu.addEventListener('popupshowing', this.createFFhelpMenu);
    }
  }

  createFFhelpMenu() {
    if (this.window.document
      .querySelectorAll('#menu_HelpPopup>.cliqz-item').length > 0) return;

    this.helpMenu.insertBefore(this.tipsAndTricks(this.window), this.helpMenu.firstChild);
    this.helpMenu.insertBefore(this.feedback(this.window), this.helpMenu.firstChild);
  }

  simpleBtn(doc, txt, func, action) {
    const item = doc.createElement('menuitem');
    item.setAttribute('label', txt);
    item.setAttribute('action', action);
    item.classList.add('cliqz-item');

    if (func) {
      item.addEventListener(
        'command',
        () => {
          utils.telemetry({
            type: 'activity',
            action: 'cliqz_menu_button',
            button_name: action,
          });
          func();
        },
        false);
    } else {
      item.setAttribute('disabled', 'true');
    }

    return item;
  }

  tipsAndTricks(win) {
    return this.simpleBtn(win.document,
      getMessage('btnTipsTricks'),
      () => utils.openTabInWindow(win, TRIQZ_URL),
      'triqz'
    );
  }

  feedback(win) {
    return this.simpleBtn(win.document,
      getMessage('btnFeedbackFaq'),
      () => {
        // TODO - use the original channel instead of the current one (it will be changed at update)
        utils.openTabInWindow(win, config.settings.USER_SUPPORT_URL);
      },
      'feedback'
    );
  }

  unload() {
    removeStylesheet(this.window.document, STYLESHEET_URL);
    if (this.toolbarButton) {
      this.toolbarButton.removeWindow(this.window);
    }
    if (this.pageAction) {
      this.pageAction.removeWindow(this.window);
      const pageActionBtn = this.window.document.getElementById(this.pageAction.id);
      pageActionBtn.parentNode.removeChild(pageActionBtn);
    }

    if (this.helpMenu) {
      // remove custom items from the Help Menu
      const nodes = this.helpMenu.querySelectorAll('.cliqz-item');

      Array.prototype.slice.call(nodes, 0)
        .forEach(node => this.helpMenu.removeChild(node));

      this.helpMenu.removeEventListener('popupshowing', this.createFFhelpMenu);
    }
  }
}
