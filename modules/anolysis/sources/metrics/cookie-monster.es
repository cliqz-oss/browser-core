import prefs from '../../core/prefs';

export default [
  {
    name: 'cookie-monster.cookieBatch',
    schema: {
      required: ['count', 'existing', 'visited', 'deleted', 'modified'],
      properties: {
        count: { type: 'number', minimum: 0 },
        existing: { type: 'number', minimum: 0 },
        visited: { type: 'number', minimum: 0 },
        deleted: { type: 'number', minimum: 0 },
        modified: { type: 'number', minimum: 0 },
        expired: { type: 'number', minimum: 0 },
      },
    },
  }, {
    name: 'cookie-monster.prune',
    schema: {
      required: ['visitsPruned', 'cookiesPruned', 'visitsCount', 'cookiesCount'],
      properties: {
        visitsPruned: { type: 'number', minimum: 0 },
        cookiesPruned: { type: 'number', minimum: 0 },
        visitsCount: { type: 'number', minimum: 0 },
        cookiesCount: { type: 'number', minimum: 0 },
      }
    }
  }, {
    name: 'cookie-monster.config',
    offsets: [0],
    generate: () => [{
      sessionExpiryEnabled: prefs.get('cookie-monster.expireSession', false),
      nonTrackerEnabled: prefs.get('cookie-monster.nonTracker', false),
      cookieMode: prefs.get('attrack.cookieMode', 'thirdparty'),
      cookieBehavior: prefs.get('network.cookie.cookieBehavior', 5, ''),
    }],
    schema: {
      required: [
        'sessionExpiryEnabled',
        'nonTrackerEnabled',
        'cookieMode',
        'cookieBehavior',
      ],
      properties: {
        sessionExpiryEnabled: { type: 'boolean' },
        nonTrackerEnabled: { type: 'boolean' },
        cookieMode: { type: 'string', enum: ['thirdparty', 'trackers', 'ghostery'] },
        cookieBehavior: { type: 'number', enum: [0, 1, 2, 3, 4, 5] },
      },
    },
  },
];
