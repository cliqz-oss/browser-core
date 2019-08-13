
export default {
  name: 'analyses.legacy.navigation',
  version: 1,
  generate: ({ records }) => ([{
    locationChange: records.get('metrics.navigation').length,
  }]),
  schema: {
    require: ['locationChange'],
    properties: {
      locationChange: { type: 'number' },
    },
  }
};
