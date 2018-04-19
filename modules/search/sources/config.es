import config from '../core/config';

const searchConfig = {
  mixers: {
    'context-search': {
      isEnabled: true,
    },
  },
  // order of providers can be overridden by platform config file
  providers: {
    instant: {
      order: 0,
      waitForBackendOrHistory: false,
    },
    calculator: {
      order: 1,
    },
    history: {
      maxQueryLengthToWait: 4,
      order: 2,
    },
    historyView: {
      isEnabled: true,
      order: 3,
    },
    cliqz: {
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
  if (searchConfig.providers[provider]) {
    searchConfig.providers[provider].order = index;
  }
});

export default searchConfig;
