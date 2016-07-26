import PrivacyRep from 'privacy-dashboard/main';
import { utils } from 'core/cliqz';


export default class {

  init() {
    PrivacyRep.onExtensionStart();
  }

  unload() {}

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
