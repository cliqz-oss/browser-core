import { utils } from "core/cliqz";
import UI from "mobile-ui/UI";

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
  	window.CLIQZ.UI = UI;
  	window.CLIQZ.UI.init();
  }

  unload() {}
}
