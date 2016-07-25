import { utils } from "core/cliqz";
import History from "mobile-history/history";

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
  	this.window.History = History;
  }

  unload() {}
}
