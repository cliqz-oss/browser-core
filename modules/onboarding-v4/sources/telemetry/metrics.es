const DEMOGRAPHICS = [
  'product',
  'extension',
  'os',
];

export default [
  {
    name: 'metrics.onboarding-v4.click',
    sendToBackend: {
      version: 1,
      demographics: DEMOGRAPHICS,
    },
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
    sendToBackend: {
      version: 1,
      demographics: DEMOGRAPHICS,
    },
    schema: {
      required: ['view'],
      properties: {
        view: { type: 'string' }
      }
    },
  },
  {
    name: 'metrics.onboarding-v4.hide',
    sendToBackend: {
      version: 1,
      demographics: DEMOGRAPHICS,
    },
    schema: {
      required: ['view'],
      properties: {
        view: { type: 'string' }
      }
    },
  },
];
