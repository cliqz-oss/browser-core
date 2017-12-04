export default {
  providers: {
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
    limit: {
      limits: {
        cliqz: 3,
        history: 3,
        'query-suggestions': 5,
      },
    },
  },
};
