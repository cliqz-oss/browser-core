//
// An action with its execution time in milliseconds.
//
export default {
  name: 'metrics.performance.general',
  schema: {
    required: ['action', 'ms'],
    properties: {
      action: {
        type: 'string',
        enum: [
          'offers-v2.trigger.process',
        ]
      },
      ms: { type: 'number', minimum: 0 },
    },
  },
};
