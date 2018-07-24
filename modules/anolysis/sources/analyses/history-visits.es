export default [{
  name: 'analysis.history.visits.count',
  version: 1,
  needsGid: true,
  sendToBackend: true,
  generate: ({ records }) => {
    const visitsCountSignals = records.get('metrics.history.visits.count');

    if (visitsCountSignals.length === 0) {
      return [];
    }

    let count = visitsCountSignals.reduce((acc, cur) => acc + cur.visitsCount, 0);

    if (count > 300) {
      count = null;
    }

    return [{
      count,
    }];
  },
  schema: {
    required: ['count'],
    properties: {
      // capped at 300
      count: {
        oneOf: [
          // capped at 300
          { type: 'integer', minimum: 0, maximum: 300 },
          // report null if > 300
          { type: 'null' }
        ]
      }
    },
  },
}];
