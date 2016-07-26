import { utils } from "core/cliqz";
import News from "mobile-freshtab/news";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.News = News;
  }

  unload() {}
}
