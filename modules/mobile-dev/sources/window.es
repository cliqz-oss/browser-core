import { utils } from "core/cliqz";
import Test from "mobile-dev/test";
import MockOS from "mobile-dev/MockOS";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.Test = Test;
  	this.window.Test.init();
  	
  	this.window.MockOS = MockOS;
  }

  unload() {}
}
