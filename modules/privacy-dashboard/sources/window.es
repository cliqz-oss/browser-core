import PrivacyRep from 'privacy-dashboard/main';
import { utils } from 'core/cliqz';

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
    var btn = win.CLIQZ.Core.createSimpleBtn(
      win.document,
      utils.getLocalizedString('btnPrivacyDashboard'),
      function(){
        utils.openTabInWindow(win, 'about:transparency');
      }, 'Cliqz Privacy Dashboard');
    return btn;
  }
}
