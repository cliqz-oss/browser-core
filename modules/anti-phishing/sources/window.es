import {utils} from "core/cliqz";
import CliqzAntiPhishing from "anti-phishing/anti-phishing";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (utils.isPrivate(this.window)) {
      this.window.gBrowser.addProgressListener(CliqzAntiPhishing.listener);
    }
  }

  unload() {
    if (utils.isPrivate(this.window)) {
      this.window.gBrowser.removeProgressListener(CliqzAntiPhishing.listener);
    }
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
      win.CLIQZ.Core.createCheckBoxItem(
        doc,
        'cliqz-anti-phishing-enabled',
        utils.getLocalizedString('anti-phishing-enabled'),
        true,
        this.changeAntiPhishingState)
    );

    // learn more
    menuPopup.appendChild(
      win.CLIQZ.Core.createSimpleBtn(
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
