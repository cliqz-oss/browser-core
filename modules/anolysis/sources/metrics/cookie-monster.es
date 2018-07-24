
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
  }
];
