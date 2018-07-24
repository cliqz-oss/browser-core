export default [
  {
    name: 'metrics.favorites.migration.folders',
    schema: {
      required: ['count', 'rootFolderCount', 'maxDepth'],
      properties: {
        count: { type: 'integer', minimum: 0 },
        rootFolderCount: { type: 'integer', minimum: 0 },
        maxDepth: { type: 'integer', minimum: 0 }
      }
    }
  }
];
