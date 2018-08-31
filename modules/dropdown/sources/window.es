import UI from './ui';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import AppWindow from '../core/base/window';
import { isBootstrap } from '../core/platform';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/xul.css';

export default class DropdownWindow extends AppWindow {
  events = {
    'urlbar:blur': () => {
      if (!this.ui.renderer) {
        return;
      }
      this.ui.sessionEnd();
      this.ui.renderer.close();
    },
    'core:tab_select': () => {
      if (!this.ui.renderer) {
        return;
      }
      this.ui.sessionEnd();
      this.ui.renderer.close();
    },
    'search:results': ({ windowId, results, query, queriedAt }) => {
      if (this.windowId !== windowId) {
        return;
      }

      this.ui.render({
        rawResults: results,
        queriedAt,
        query,
      });
    },
  };

  actions = {
  };

  constructor(config) {
    super(config);
    this.background = config.background;
    this.settings = config.settings;

    if (isBootstrap) {
      this.ui = new UI(this.window, this.settings.id, {
        window: this.window,
        windowId: this.windowId,
        extensionID: this.settings.id,
        getSessionCount: this.background.getSessionCount.bind(this.background),
      });
    } else {
      this.ui = {
        init() {},
        unload() {},
      };
    }
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
