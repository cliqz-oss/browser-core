import { utils } from "core/cliqz";
import Test from "mobile-dev/test";
import MockOS from "mobile-dev/MockOS";

/**
* @namespace mobile-dev
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
  	this.window.Test = Test;
  	this.window.Test.init();

  	this.window.MockOS = MockOS;
  }

  unload() {}
}
