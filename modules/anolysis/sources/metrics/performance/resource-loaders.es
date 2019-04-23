export default {
  name: 'metrics.performance.app.resource-loaders',
  description: `
  This metric allows us to know how much size each resource loader takes.
  `,
  sendToBackend: true,
  needsGid: true,
  schema: {
    type: 'array',
    items: {
      required: ['name', 'size'],
      properties: {
        name: { type: 'string' },
        size: { type: 'integer' },
      },
    },
  },
};
