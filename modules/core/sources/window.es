import Storage from "core/storage";

export default class {

  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.CLIQZ.CliqzStorage = new Storage();
  }

  unload() {
  }
}
