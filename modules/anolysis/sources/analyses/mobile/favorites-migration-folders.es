export default {
  name: 'analyses.favorites.migration.folders',
  version: 1,
  needsGid: true,
  sendToBackend: true,
  generate: ({ records }) => records.get('metrics.favorites.migration.folders').splice(-1),
  schema: {
    properties: {
      count: { type: 'integer', minimum: 0 },
      rootFolderCount: { type: 'integer', minimum: 0 },
      maxDepth: { type: 'integer', minimum: 0 }
    }
  }
};
