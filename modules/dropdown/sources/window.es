import Handlebars from 'handlebars';

// TODO: remove dependency on autocomplete
import autocomplete from '../autocomplete/autocomplete';
import prefs from '../core/prefs';
import templates from './templates';
import UI from './ui';
import helpers from './helpers';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';
import AppWindow from '../core/base/window';

const STYLESHEET_URL = 'chrome://cliqz/content/dropdown/styles/styles.css';

function getResults(ctrl) {
  const query = autocomplete.lastSearch.trim();
  const rawResults = Array(ctrl.matchCount).fill().map((_, i) => {
    const data = ctrl.getDataAt(i) || {};
    const rawResult = {
      title: ctrl.getCommentAt(i),
      url: ctrl.getValueAt(i),
      description: data.description || '',
      originalUrl: ctrl.getValueAt(i),
      type: ctrl.getStyleAt(i),
      text: query,
      data,
      maxNumberOfSlots: (i === 0 ? 3 : 1),
    };
    return rawResult;
  }).filter(r => r.url !== null);

  return {
    query,
    queriedAt: autocomplete.lastQueryTime,
    rawResults,
  };
}

export default class DropdownWindow extends AppWindow {
  events = {
    'urlbar:input': () => {
      if (prefs.get('searchMode') !== 'autocomplete') {
        return;
      }
      this.ui.updateFirstResult();
    },

    'search:results': ({ windowId, results }) => {
      if (this.windowId !== windowId) {
        return;
      }

      if (!this.isReady) {
        return;
      }

      const query = this.window.gURLBar.mController.searchString.trim();

      this.ui.render({
        rawResults: results,
        queriedAt: Date.now(),
        query,
      });
    },
  };

  actions = {
    init: () => {
      this.ui.handleResults = () => {
        if (prefs.get('searchMode', 'autocomplete') !== 'autocomplete') {
          return;
        }

        const ctrl = autocomplete.lastResult;

        if (!ctrl) {
          return;
        }

        const results = getResults(ctrl);
        this.ui.render(results);
      };
      this.isReady = true;
      this.window.CLIQZ.UI = this.ui;
      this.ui.init();
    }
  };

  constructor(config) {
    super(config);
    this.background = config.background;
    this.settings = config.settings;
    this.ui = new UI(this.window, this.settings.id, {
      getSessionCount: this.background.getSessionCount.bind(this.background),
    });
    this.isReady = false;
  }

  init() {
    super.init();
    Handlebars.partials = Object.assign({}, Handlebars.partials, templates);
    addStylesheet(this.window.document, STYLESHEET_URL);

    Object.keys(helpers).forEach(
      helperName => Handlebars.registerHelper(helperName, helpers[helperName])
    );
  }

  unload() {
    super.unload();
    delete this.window.CLIQZ.UI;
    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.ui.unload();
  }
}
