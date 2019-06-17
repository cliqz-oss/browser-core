import config from '../core/config';
import deepFreeze from '../core/helpers/deep-freeze';
import prefs from '../core/prefs';
import { PREVENT_AUTOCOMPLETE_KEYS } from './consts';

// do not emit instant or Cliqz results until history has emitted,
// unless the query is long enough or the user is deleting characters
const prioritizeHistoryCondition = ({ query, keyCode }) =>
  query.length < 4 && !PREVENT_AUTOCOMPLETE_KEYS.includes(keyCode);

const DEFAULT_CONFIG = {
  clearResultsOnSessionStart: true,
  mixers: {
    'context-search': {
      isEnabled: config.modules.includes('context-search'),
    },
  },
  // order of providers can be overridden by platform config file
  providers: {
    instant: {
      order: 0,
      dependencies: [
        { provider: 'history', condition: prioritizeHistoryCondition },
      ],
    },
    calculator: {
      order: 1,
    },
    history: {
      order: 2,
    },
    historyView: {
      isEnabled: config.modules.indexOf('history') > -1,
      order: 3,
    },
    cliqz: {
      isEnabled: true,
      dependencies: [
        { provider: 'history', condition: prioritizeHistoryCondition },
      ],
      includeOffers: true,
      count: config.settings['search.config.providers.cliqz.count'] || 5,
      jsonp: config.settings['search.config.providers.cliqz.jsonp'] || false,
      order: 4,
    },
    'rich-header': {
      retry: {
        count: 10,
        delay: 300,
      },
    },
    querySuggestions: {
      isEnabled: true,
      order: 5,
    },
  },
  operators: {
    offers: {
      isEnabled: true,
      locationEnabled: true,
      position: 'first',
    },
    responses: {
      smoothResponses: {
        isEnabled: true,
      },
      smoothClusters: {
        isEnabled: true,
      },
    },
    streams: {
      throttleQueries: {
        interval: config.settings.THROTTLE_QUERIES || 10,
      },
      limitResults: {
        limits: {
          cliqz: config.settings['search.config.operators.limit.limits.cliqz'] || 3,
          history: 3,
          cluster: 5,
          querySuggestions: 5,
        },
      },
      waitForAllProviders: {
        isEnabled: config.settings['search.config.operators.streams.waitForAllProviders'] || false,
      },
      smoothResults: {
        isEnabled: true,
      },
    }
  },
};

const providersOrder = config.settings.RESULTS_PROVIDER_ORDER || [];
providersOrder.forEach((provider, index) => {
  if (DEFAULT_CONFIG.providers[provider]) {
    DEFAULT_CONFIG.providers[provider].order = index;
  }
});

const clearResultsOnSessionStart = config.settings.CLEAR_RESULTS_AT_SESSION_START;
if (typeof clearResultsOnSessionStart === 'boolean') {
  DEFAULT_CONFIG.clearResultsOnSessionStart = clearResultsOnSessionStart;
}

// deepFreeze has a cost and we probably do not need to pay it on mobile. If
// there are issues with config mutations they can be catched on other
// platforms, during tests and during dev.
if (config.isMobile !== true) {
  deepFreeze(DEFAULT_CONFIG);
}

export default function ({ isPrivateMode }, settings = {}) {
  return {
    settings,
    ...DEFAULT_CONFIG,
    isPrivateMode,
    mixers: {
      ...DEFAULT_CONFIG.mixers,
      'context-search': {
        get isEnabled() {
          return prefs.get(
            'modules.context-search.enabled',
            DEFAULT_CONFIG.mixers['context-search'].isEnabled
          );
        },
      },
    },
    providers: {
      ...DEFAULT_CONFIG.providers,
      history: {
        ...DEFAULT_CONFIG.providers.history,
        get isHistoryLookupEnabled() {
          return prefs.get('historyLookupEnabled', false);
        },
        get isTabSearchEnabled() {
          return prefs.get('tabSearchEnabled', false);
        },
      },
      historyView: {
        ...DEFAULT_CONFIG.providers.historyView,
        get isEnabled() {
          return prefs.get(
            'modules.history.enabled',
            DEFAULT_CONFIG.providers.historyView.isEnabled
          );
        },
      },
      querySuggestions: {
        ...DEFAULT_CONFIG.providers.querySuggestions,
        get isEnabled() {
          return (
            !isPrivateMode
            && DEFAULT_CONFIG.providers.querySuggestions.isEnabled
            && (prefs.get('suggestionChoice', 0) === 2)
          );
        },
      },
      instant: {
        ...DEFAULT_CONFIG.providers.instant,
        get isEnabled() {
          const res = config.settings['search.config.providers.instant.isEnabled'];
          return typeof res === 'boolean'
            ? res
            : true;
        },
      },
      cliqz: {
        ...DEFAULT_CONFIG.providers.cliqz,
        get isEnabled() {
          return prefs.get('modules.search.providers.cliqz.enabled',
            DEFAULT_CONFIG.providers.cliqz.isEnabled);
        },
      },
    },
    operators: {
      ...DEFAULT_CONFIG.operators,
      addCompletion: {
        get isEnabled() {
          return prefs.get('browser.urlbar.autoFill', true, '');
        },
        providerBlacklist: ['instant', 'querySuggestions', 'historyView'],
      },
      offers: {
        position: DEFAULT_CONFIG.operators.offers.position,
        get isEnabled() {
          return (
            prefs.get('offers2UserEnabled', true)
          );
        },

        get locationEnabled() {
          return prefs.get('offers_location', 1) === 1;
        }
      },
      responses: {
        ...DEFAULT_CONFIG.operators.responses,
        smoothResponses: {
          ...DEFAULT_CONFIG.operators.responses.smoothResponses,
          get isEnabled() {
            return prefs.get(
              'modules.search.operators.responses.smoothResponses.isEnabled',
              DEFAULT_CONFIG.operators.responses.smoothResponses.isEnabled
            );
          },
        },
        smoothClusters: {
          ...DEFAULT_CONFIG.operators.responses.smoothClusters,
          get isEnabled() {
            return prefs.get(
              'modules.search.operators.responses.smoothClusters.isEnabled',
              DEFAULT_CONFIG.operators.responses.smoothClusters.isEnabled
            );
          },
        },
      },
      streams: {
        ...DEFAULT_CONFIG.operators.streams,
        limitResults: {
          ...DEFAULT_CONFIG.operators.streams.limitResults,
          limits: {
            ...DEFAULT_CONFIG.operators.streams.limitResults.limits,
            ...prefs.get('experiments.dropdown.fullHeight') === true
              ? { cliqz: undefined, history: undefined, cluster: undefined } : {},
          },
        },
        smoothResults: {
          ...DEFAULT_CONFIG.operators.streams.smoothResults,
          get isEnabled() {
            return prefs.get(
              'modules.search.operators.streams.smoothResults.isEnabled',
              DEFAULT_CONFIG.operators.streams.smoothResults.isEnabled
            );
          },
        },
      },
    },
  };
}
