import { utils } from "core/cliqz";
import News from "mobile-freshtab/news";
import templates from "mobile-freshtab/templates";
import helpers from 'mobile-freshtab/content/helpers';
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
    window.CLIQZ.freshtabTemplates = Handlebars.freshtabTemplates = templates;
    Object.keys(helpers).forEach(function (helperName) {
      Handlebars.registerHelper(helperName, helpers[helperName]);
    });
  	this.window.News = News;
  }

  unload() {}
}
