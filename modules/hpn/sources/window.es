import background from 'hpn/background';

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

		    var safeSearchBtn = win.CLIQZ.Core.createCheckBoxItem(doc, prefKey, CliqzUtils.getLocalizedString('btnSafeSearch'), true);
		    menuPopup.appendChild(safeSearchBtn);

		    menuPopup.appendChild(
		        win.CLIQZ.Core.createSimpleBtn(
		            doc,
		            CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
		            function(){
		                    CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/products/proxy');
		                },
		            'safe_search_desc'
		        )
		    );

		    menu.appendChild(menuPopup)
		    return menu;
		}
	}


};
