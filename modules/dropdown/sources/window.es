import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import AppWindow from '../core/base/window';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/xul.css';

export default class DropdownWindow extends AppWindow {
  events = {
  };

  actions = {
  };

  constructor(config) {
    super(config);
    this.background = config.background;
    this.settings = config.settings;

    this.ui = {
      init() {},
      unload() {},
    };
  }

  init() {
    super.init();
    addStylesheet(this.window.document, STYLESHEET_URL);
    this.window.CLIQZ.UI = this.ui;
    this.ui.init();
  }

  unload() {
    super.unload();
    delete this.window.CLIQZ.UI;
    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.ui.unload();
  }
}
