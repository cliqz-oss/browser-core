export default {
  name: 'metrics.performance.app.startup',
  description: `
  This metric allows us to know how long it took to load each modules from App.
  This does not contain any user behavior, but instead informs about how App
  loading performs depending on platforms or products.
  `,
  sendToBackend: true,
  needsGid: true,
  schema: {
    type: 'array',
    items: {
      required: ['module', 'isEnabled', 'loadingTime', 'windows'],
      properties: {
        module: { type: 'string' },
        isEnabled: { type: 'boolean' },
        loadingTime: { type: 'integer' },
        loadingTimeSync: { type: 'integer' },
        windows: {
          type: 'array',
          items: {
            required: ['id', 'loadingTime'],
            properties: {
              id: { type: 'string' },
              loadingTime: { type: 'number' },
            }
          },
        },
      },
    },
  },
};
