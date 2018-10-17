export const SOURCES = ['tokens', 'keys'];

export default [
  {
    name: 'metrics.antitracking.tokens.batch',
    schema: {
      required: ['source', 'size', 'toBeSentSize', 'overflow', 'messages'],
      properties: {
        source: { type: 'string', enum: SOURCES },
        size: { type: 'number', minimum: 0 },
        toBeSentSize: { type: 'number', minimum: 0 },
        overflow: { type: 'number', minimum: 0 },
        messages: { type: 'number', minimum: 0 },
      },
    },
  }, {
    name: 'metrics.antitracking.tokens.clean',
    schema: {
      required: ['source', 'dbSize', 'dbDelete', 'cacheSize', 'cacheDeleted', 'processed'],
      properties: {
        source: { type: 'string', enum: SOURCES },
        dbSize: { type: 'number', minimum: 0 },
        dbDelete: { type: 'number', minimum: 0 },
        cacheSize: { type: 'number', minimum: 0 },
        cacheDeleted: { type: 'number', minimum: 0 },
        processed: { type: 'number', minimum: 0 },
      }
    }
  }
];
