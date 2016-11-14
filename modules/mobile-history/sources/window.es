import { utils } from "core/cliqz";
import History from "mobile-history/history";
import helpers from 'mobile-history/content/helpers';

/**
* @namespace mobile-history
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
    Object.keys(helpers).forEach(function (helperName) {
      Handlebars.registerHelper(helperName, helpers[helperName]);
    });
  	this.window.History = History;
  }

  unload() {}
}
