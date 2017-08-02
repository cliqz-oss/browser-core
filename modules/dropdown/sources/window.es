import Handlebars from 'handlebars';
import templates from './templates';
import UI from './ui';
import helpers from './helpers';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/styles.css';

export default class {
  constructor(config) {
    this.window = config.window;
    this.background = config.background;
    this.settings = config.settings;
    this.ui = new UI(this.window, {
      getSessionCount: this.background.getSessionCount.bind(this.background),
    });

    this.actions = {
      init: () => {
        this.window.CLIQZ.UI = this.ui;
        this.ui.init();
      }
    };
  }

  init() {
    Handlebars.partials = Object.assign({}, Handlebars.partials, templates);
    addStylesheet(this.window.document, STYLESHEET_URL);

    Object.keys(helpers).forEach(
      helperName => Handlebars.registerHelper(helperName, helpers[helperName])
    );
  }

  unload() {
    delete this.window.CLIQZ.UI;
    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.ui.unload();
  }
}
