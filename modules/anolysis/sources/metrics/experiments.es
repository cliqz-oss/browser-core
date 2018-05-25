export default [
  {
    name: 'metrics.experiments.serp.click.result',
    schema: {
      source: { type: 'string', enum: ['m', 'Z'] },
      index: { type: 'integer', minimum: 0 },
      queryLength: { type: 'integer', minimum: 0 },
    },
  },
  {
    name: 'metrics.experiments.serp.click.search',
    schema: {},
  },
  {
    name: 'metrics.experiments.serp.show',
    schema: {
      queryLength: { type: 'integer', minimum: 0 },
      resultCount: { type: 'integer', minimum: 0 },
      suggestionCount: { type: 'string', enum: ['m', 'Z'] },
    },
  },
  {
    name: 'metrics.experiments.serp.state',
    schema: {
      group: { enum: ['A', 'B', 'C', null] },
      isCliqzDefaultEngine: { type: 'boolean' },
    },
  },
];
