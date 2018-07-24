export default [
  {
    name: 'metrics.history.visits.count',
    schema: {
      required: ['visitsCount'],
      properties: {
        visitsCount: { type: 'integer', minimum: 0 },
      },
    },
  },
];
