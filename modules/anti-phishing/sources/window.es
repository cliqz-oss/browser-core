import {utils} from "core/cliqz";
import CliqzAntiPhishing from "anti-phishing/anti-phishing";
import { simpleBtn, checkBox } from 'q-button/buttons';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    this.window.gBrowser.addProgressListener(CliqzAntiPhishing.listener);
  }

  unload() {
    this.window.gBrowser.removeProgressListener(CliqzAntiPhishing.listener);
  }

  changeAntiPhishingState() {
    utils.setPref('cliqz-anti-phishing-enabled', !utils.getPref('cliqz-anti-phishing-enabled', false));
  }

  createButtonItem(win) {
    if (!CliqzAntiPhishing.isAntiPhishingActive()) {
      return;
    }
    var doc = win.document,
        menu = doc.createElement('menu'),
        menuPopup = doc.createElement('menupopup');

    menu.setAttribute('label', utils.getLocalizedString('anti-phishing'));

    // HumanWeb checkbox
    menuPopup.appendChild(
      checkBox(
        doc,
        'cliqz-anti-phishing-enabled',
        utils.getLocalizedString('anti-phishing-enabled'),
        true,
        this.changeAntiPhishingState)
    );

    // learn more
    menuPopup.appendChild(
      simpleBtn(
        doc,
        utils.getLocalizedString('learnMore'),
        function(){
          utils.openTabInWindow(win, 'https://cliqz.com/whycliqz/anti-phishing');
        },
        'anti_phishing_desc')
    );

    menu.appendChild(menuPopup);

    return menu;
  }
}
