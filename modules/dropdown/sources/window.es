import Handlebars from 'handlebars';
import templates from './templates';
import UI from './ui';
import helpers from './helpers';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/styles.css';

export default class {
  constructor({ window, background }) {
    this.window = window;
    this.ui = new UI(this.window, {
      getSessionCount: background.getSessionCount.bind(background),
    });

    this.actions = {
      init: () => {
        this.window.CLIQZ.UI = this.ui;
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
  }
}
