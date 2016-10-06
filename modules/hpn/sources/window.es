import { utils } from "core/cliqz";
import background from 'hpn/background';
import { simpleBtn, checkBox } from 'q-button/buttons';

const prefKey = 'hpn-query', // 0 - enable, 1 - disable
      BLOCK = false,
      ALLOW = true;
export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  	if(background.CliqzSecureMessage){
  		background.CliqzSecureMessage.initAtWindow(this.window);
  	}
  }

  unload() {
  }

	createButtonItem(win){
		if(background.CliqzSecureMessage && !CliqzUtils.getPref("cliqz_core_disabled", false)){
		    var doc = win.document,
		        menu = doc.createElement('menu'),
		        menuPopup = doc.createElement('menupopup');

		    menu.setAttribute('label', CliqzUtils.getLocalizedString('btnSecureChannel'));

		    var safeSearchBtn = checkBox(doc, prefKey, CliqzUtils.getLocalizedString('btnSafeSearch'), true);
		    menuPopup.appendChild(safeSearchBtn);

		    menuPopup.appendChild(
		        simpleBtn(
		            doc,
		            CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
		            function(){
		                    CliqzUtils.openTabInWindow(win, 'https://cliqz.com/products/proxy');
		                },
		            'safe_search_desc'
		        )
		    );

		    menu.appendChild(menuPopup)
		    return menu;
		}
	}

  status() {
    if(background.CliqzSecureMessage && !CliqzUtils.getPref("cliqz_core_disabled", false)){
      return {
        visible: true,
        state: utils.getPref(prefKey)
      }
    }
  }
};
