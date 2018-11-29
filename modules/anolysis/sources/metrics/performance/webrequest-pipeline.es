const do5x = [...'12345'];
const do10x = [...'1234567890'];

// An array index is number of milliseconds, the value is the
// corresponding bin name. The constant helps an analyzer to
// construct the bin structure from individual measurements.
export const MS_TO_BIN_NAME = [
  '0', '1', '2', '3', '4',
  ...do5x.map(() => '5-9'),
  ...do5x.map(() => '10-14'),
  ...do5x.map(() => '15-19'),
  ...do5x.map(() => '20-24'),
  ...do5x.map(() => '25-29'),
  ...do10x.map(() => '30-39'),
  ...do10x.map(() => '40-49'),
  ...do10x.map(() => '50-59'),
  ...do10x.map(() => '60-69'),
  '70+'
];

// A list of 'step' names.
// For each step, a map from a bin name to the number of occurrences.
//
// The metric is reused by the analyser for "metrics.performance.general".
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
