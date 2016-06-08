import { utils } from "core/cliqz";
import History from "mobile-history/history";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.History = History;
  }

  unload() {}
}
