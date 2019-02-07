export const CLICKS_TARGETS = [
  'campaign-create',
  'campaign-edit',
  'campaign-view',
  'delete-campaign',
  'redeem',
  'ref-url-copy',
  'remove-multimedia',
  'sharing-email',
  'sharing-facebook',
  'sharing-linkedin',
  'sharing-reddit',
  'sharing-twitter',
  'sharing-wordpress',
  'submit-refId',
];

export const UPLOADS_TYPES = ['audio', 'video'];

export const VISITS_PAGES = ['dashboard', 'shop', 'settings', 'redeem', 'faq'];

export default [
  {
    name: 'metrics.cliqzForFriends.upload',
    description: 'Keeps track of uploaded audio/video in cliqz-for-friends',
    schema: {
      required: ['page'],
      properties: {
        type: { enum: UPLOADS_TYPES },
      },
    },
  },
  {
    name: 'metrics.cliqzForFriends.click',
    description: 'Keeps track of clicked elements in cliqz-for-friends pages',
    schema: {
      required: ['target'],
      properties: {
        target: { enum: CLICKS_TARGETS },
      },
    },
  },
  {
    name: 'metrics.cliqzForFriends.visit',
    description: 'Keeps track of visited pages in cliqz-for-friend',
    schema: {
      required: ['page'],
      properties: {
        page: { enum: VISITS_PAGES },
      },
    },
  },
  {
    name: 'metrics.cliqzForFriends.freshtab',
    sendToBackend: true,
    needsGid: true,
    version: 1,
    description: 'This metric measures how much time users click through freshtab',
    schema: {
      required: ['click'],
      properties: {
        click: { type: 'integer', minimum: 0 },
      },
    },
  },
];
