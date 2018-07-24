import config from '../core/config';
import deepFreeze from '../core/helpers/deep-freeze';
import prefs from '../core/prefs';

// TODO: copied from 'trim'
const PREVENT_AUTOCOMPLETE_KEYS = ['Backspace', 'Delete'];

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
      dependencies: [
        { provider: 'history', condition: prioritizeHistoryCondition },
      ],
      includeOffers: true,
      order: 4,
    },
    suggestions: {
      order: 5,
    },
    'rich-header': {
      retry: {
        count: 10,
        delay: 100,
      },
    },
    'query-suggestions': {
      isEnabled: true,
    },
  },
  operators: {
    offers: {
      isEnabled: true,
      locationEnabled: true,
      position: 'first',
    },
    limit: {
      limits: {
        cliqz: 3,
        history: 3,
        'query-suggestions': 5,
      },
    },
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

deepFreeze(DEFAULT_CONFIG);

export default function ({ isPrivateMode }) {
  return {
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
      historyView: {
        order: DEFAULT_CONFIG.providers.historyView.order,
        get isEnabled() {
          return prefs.get(
            'modules.history.enabled',
            DEFAULT_CONFIG.providers.history.isEnabled
          );
        },
      },
      'query-suggestions': {
        get isEnabled() {
          return (
            !isPrivateMode &&
            DEFAULT_CONFIG.providers['query-suggestions'].isEnabled &&
            (prefs.get('suggestionChoice', 0) === 2)
          );
        },
      },
    },
    operators: {
      ...DEFAULT_CONFIG.operators,
      addCompletion: {
        get isEnabled() {
          return prefs.get('browser.urlbar.autoFill', true, '');
        },
        providerBlacklist: ['instant', 'query-suggestions'],
      },
      offers: {
        position: DEFAULT_CONFIG.operators.offers.position,
        get isEnabled() {
          return (
            prefs.get('offers2FeatureEnabled', true) &&
            prefs.get('offers2UserEnabled', true) &&
            prefs.get('offersDropdownSwitch', false)
          );
        },

        get locationEnabled() {
          return prefs.get('offers_location', 1) === 1;
        }
      }
    }
  };
}
