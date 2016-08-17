import Storage from "core/storage";
import utils from "core/utils";
import ABTests from "core/ab-tests";

export default class {

  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
    ABTests.check();
  }

  unload() {
  }
}
