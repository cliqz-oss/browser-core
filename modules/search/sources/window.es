import AppWindow from '../core/base/window';
import { getMessage } from '../core/i18n';
import prefs from '../core/prefs';
import { getSearchEngines } from '../core/search-engines';

function getProviders() {
  const currentBackend = prefs.get('backend_country', 'de');
  const all = JSON.parse(prefs.get('config_backends', '["de"]'))
    .reduce((acc, cur) => {
      acc[cur] = {
        selected: cur === currentBackend,
        name: getMessage(`country_code_${cur.toUpperCase()}`),
      };
      return acc;
    }, {});
  if (prefs.has('backend_country.override')) {
    const customCountry = prefs.get('backend_country.override');
    all[customCountry] = {
      selected: true,
      name: `Custom - [${customCountry}]`
    };
  }
  return all;
}

export default class SearchWindow extends AppWindow {
  events = {
    'urlbar:blur': () => {
      this.background.actions.stopSearch({ contextId: this.windowId });
    },

    'urlbar:input': (ev) => {
      if (!ev.isTyped) {
        return;
      }

      this.background.actions.startSearch(ev.query, ev, { contextId: this.windowId });
    },

    'ui:click-on-url': (ev) => {
      this.background.actions.reportSelection(ev, { contextId: this.windowId });
    },

    'dropdown:result-highlight': () => {
      this.background.actions.reportHighlight({ contextId: this.windowId });
    },

    'urlbar:dropmarker-click': () => {
      this.background.actions.startSearch(
        '',
        { allowEmptyQuery: true },
        { contextId: this.windowId },
      );
    },
  };

  constructor(settings) {
    super(settings);
    this.background = settings.background;
  }

  init() {
    super.init();
  }

  unload() {
    super.unload();
  }

  status() {
    let engines = [];
    try {
      engines = getSearchEngines().map(engine => ({
        name: engine.name,
        code: engine.code,
        alias: engine.alias,
        default: engine.default,
      }));
    } catch (e) {
      // may be not initailized yet
    }
    return {
      visible: true,
      state: engines,
      supportedIndexCountries: getProviders(),
      quickSearchEnabled: prefs.get('modules.search.providers.cliqz.enabled', true),
      showQuerySuggestions: prefs.get('suggestionsEnabled', false)
    };
  }
}
