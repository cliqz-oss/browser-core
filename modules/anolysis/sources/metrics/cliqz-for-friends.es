/*
* This metric measures how much time users click through freshtab
*
*/

export default [
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
