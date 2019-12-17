export default [
  {
    name: 'metrics.onboarding-v4.click',
    sendToBackend: {
      version: 1,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
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
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
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
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
    },
    schema: {
      required: ['view'],
      properties: {
        view: { type: 'string' }
      }
    },
  },
];
