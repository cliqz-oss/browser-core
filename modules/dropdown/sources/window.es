import Handlebars from 'handlebars';

// TODO: remove dependency on autocomplete
import autocomplete from '../autocomplete/autocomplete';
import { Window } from '../core/browser';
import events from '../core/events';
import prefs from '../core/prefs';
import templates from './templates';
import UI from './ui';
import helpers from './helpers';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';

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
  });

  return {
    query,
    queriedAt: autocomplete.lastQueryTime,
    rawResults,
  };
}

export default class {
  constructor(config) {
    this.window = config.window;
    this.id = (new Window(this.window)).id;
    this.background = config.background;
    this.settings = config.settings;
    this.ui = new UI(this.window, this.settings.id, {
      getSessionCount: this.background.getSessionCount.bind(this.background),
    });
    this.isReady = false;

    this.actions = {
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

    this.onResults = this.onResults.bind(this);
  }

  init() {
    events.sub('search:results', this.onResults);
    Handlebars.partials = Object.assign({}, Handlebars.partials, templates);
    addStylesheet(this.window.document, STYLESHEET_URL);

    Object.keys(helpers).forEach(
      helperName => Handlebars.registerHelper(helperName, helpers[helperName])
    );
  }

  onResults({ windowId, results }) {
    if (this.id !== windowId) {
      return;
    }

    if (!this.isReady) {
      return;
    }

    this.ui.render({
      rawResults: results,
      queriedAt: Date.now(),
      query: this.window.gURLBar.mController.searchString,
    });
  }

  unload() {
    events.un_sub('search:results', this.onResults);
    delete this.window.CLIQZ.UI;
    removeStylesheet(this.window.document, STYLESHEET_URL);
    this.ui.unload();
  }
}
