import { utils } from "core/cliqz";
import News from "mobile-freshtab/news";
/**
* @namespace mobile-freshtab
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
  	this.window.News = News;
  }

  unload() {}
}
