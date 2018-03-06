export default {
  mixers: {
    'context-search': {
      isEnabled: true,
    },
  },
  providers: {
    cliqz: {
      includeOffers: true,
    },
    history: {
      maxQueryLengthToWait: 4,
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
      nonOrganicStyle: 'plain',
      nonOrganicPosition: 'first',
      organicStyle: 'plain',
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
