export default [
  {
    name: 'metrics.favorites.migration.folders',
    schema: {
      properties: {
        count: { type: 'integer', minimum: 0 },
        rootFolderCount: { type: 'integer', minimum: 0 },
        maxDepth: { type: 'integer', minimum: 0 }
      }
    }
  }
];
