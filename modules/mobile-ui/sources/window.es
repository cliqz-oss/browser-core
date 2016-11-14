import { utils } from "core/cliqz";
import UI from "mobile-ui/UI";
import helpers from 'mobile-ui/content/helpers';
import VIEWS from 'mobile-ui/views';

/**
* @namespace mobile-ui
*/
export default class {
  /**
  * @class Window
  * @constructor
  * @param settings
  */
  constructor(settings) {
  	this.window = settings.window;
  }
  /**
  * @method init
  */
  init() {
    Object.keys(VIEWS).forEach(view => UI.VIEWS[view] = new (VIEWS[view])() );

    Object.keys(helpers).forEach(function (helperName) {
      Handlebars.registerHelper(helperName, helpers[helperName]);
    });
  	window.CLIQZ.UI = UI;
  	window.CLIQZ.UI.init();
  }

  unload() {}
}
