export default [
  {
    name: 'metrics.onboarding-v4.click',
    sendToBackend: true,
    needsGid: true,
    version: 1,
    schema: {
      required: ['target', 'view'],
      properties: {
        index: { type: 'integer' },
        target: {
          type: 'string',
          enum: [
            'activate',
            'close',
            'continue',
            'import',
            'learn_more',
            'menu_right',
            'next',
            'proceed',
            'skip',
            'toggle',
            'try_now',
          ]
        },
        view: { type: 'string' },
      }
    },
  },
  {
    name: 'metrics.onboarding-v4.show',
    sendToBackend: true,
    needsGid: true,
    version: 1,
    schema: {
      required: ['view'],
      properties: {
        view: { type: 'string' }
      }
    },
  },
  {
    name: 'metrics.onboarding-v4.hide',
    sendToBackend: true,
    needsGid: true,
    version: 1,
    schema: {
      required: ['view'],
      properties: {
        view: { type: 'string' }
      }
    },
  },
];
