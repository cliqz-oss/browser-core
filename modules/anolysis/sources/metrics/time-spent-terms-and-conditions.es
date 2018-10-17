/*
* This metric measures how long do users spend interacting with
* terms and conditions of Google.
*
* In both mobile and desktop it seems that (at least in google's serp page)
* terms and conditions are always shown on `consent.google.com`. On desktop this
* is done via an iframe, whereas on mobile it redirects you there.
*
* The time spent on consent.google.com is assumed to be a good proxy for how long
* it takes for giving consent
*/

export default [
  {
    name: 'metrics.termsAndConditions.duration',
    sendToBackend: true,
    needsGid: true,
    version: 1,
    schema: {
      required: ['duration'],
      properties: {
        duration: { type: 'integer', minimum: 0 },
      },
    },
  },
];
