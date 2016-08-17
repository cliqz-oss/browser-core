import PrivacyRep from 'privacy-dashboard/main';
import { utils } from 'core/cliqz';
import { simpleBtn } from 'q-button/buttons';

/**
* @namespace privacy-dashboard
* @class Window
*/
export default class {
  /**
  * @method init
  */
  init() {
    PrivacyRep.onExtensionStart();
  }

  unload() {}
  /**
  * @method createButtonItem
  * @param win
  */
  createButtonItem(win) {
    if (utils.getPref("cliqz_core_disabled", false)) return;

    var btn = simpleBtn(
      win.document,
      utils.getLocalizedString('btnPrivacyDashboard'),
      function(){
        utils.openTabInWindow(win, 'about:transparency');
      }, 'Cliqz Privacy Dashboard');
    return btn;
  }
}
