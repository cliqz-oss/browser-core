
export default {
  name: 'metrics.performance.webrequest-pipeline.timings',
  schema: {
    type: 'array',
    minItems: 1,
    items: {
      required: ['step', 'histogram'],
      type: 'object',
      properties: {
        step: { type: 'string' },
        histogram: {
          type: 'object',
          minProperties: 1,
          required: [],
          properties: {
            // Bins of 1ms
            0: { type: 'integer', minimum: 1 },
            1: { type: 'integer', minimum: 1 },
            2: { type: 'integer', minimum: 1 },
            3: { type: 'integer', minimum: 1 },
            4: { type: 'integer', minimum: 1 },

            // Bins of 5ms
            '5-9': { type: 'integer', minimum: 1 },
            '10-14': { type: 'integer', minimum: 1 },
            '15-19': { type: 'integer', minimum: 1 },
            '20-24': { type: 'integer', minimum: 1 },
            '25-29': { type: 'integer', minimum: 1 },

            // Bins of 10ms
            '30-39': { type: 'integer', minimum: 1 },
            '40-49': { type: 'integer', minimum: 1 },
            '50-59': { type: 'integer', minimum: 1 },
            '60-69': { type: 'integer', minimum: 1 },

            // Catch all
            '70+': { type: 'integer', minimum: 1 },
          },
        },
      },
    },
  },
};
