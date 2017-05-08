import Handlebars from 'handlebars';
import { utils } from '../core/cliqz';
import History from './history';
import templates from './templates';
import helpers from './content/helpers';

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
    this.mode = settings.mode;
  }
  /**
  * @method init
  */
  init() {
    Object.keys(helpers).forEach(function (helperName) {
      Handlebars.registerHelper(helperName, helpers[helperName]);
    });
    window.CLIQZ.templates = Handlebars.templates = templates;
  	this.window.History = History;
    this.history = History;
  }

  unload() {}
}
