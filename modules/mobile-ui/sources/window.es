import { utils } from "core/cliqz";
import UI from "mobile-ui/UI";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	window.CLIQZ.UI = UI;
  	window.CLIQZ.UI.init();
  }

  unload() {}
}
