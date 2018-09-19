
export const CONSENT_TYPES = [
  'iab',
  'google',
  'facebook'
];

export default [
  {
    name: 'metrics.consentric.pageAction',
    schema: {
      required: ['type', 'site'],
      properties: {
        type: { type: 'string', enum: CONSENT_TYPES },
        site: { type: 'string' },
      },
    },
  }, {
    name: 'metrics.consentric.popupOpened',
    schema: {
      required: ['type', 'site'],
      properties: {
        type: { type: 'string', enum: CONSENT_TYPES },
        writeable: { type: 'boolean' },
        site: { type: 'string' },
      },
    },
  }, {
    name: 'metrics.consentric.consentChanged',
    schema: {
      required: ['allowed', 'site'],
      properties: {
        allowed: { type: 'number', minimum: 0, maximum: 5 },
        site: { type: 'string' },
      },
    },
  }, {
    name: 'metrics.consentric.clicked',
    schema: {
      required: ['type'],
      properties: {
        type: { type: 'string', enum: CONSENT_TYPES },
        site: { type: 'string' },
      },
    },
  },
];
