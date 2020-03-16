
export default [{
  name: 'youtube-fixer.metric.cookieError',
  sendToBackend: {
    version: 2,
    demographics: [
      'platform',
      'product',
    ],
    ephemerid: {
      kind: 'relative',
      unit: 'day',
      n: 60,
    },
  },
  schema: {
    required: ['statusCode', 'cookies'],
    properties: {
      statusCode: { type: 'integer', min: 500 },
      cookies: { type: 'integer', min: 0 },
      antitrackingEnabled: { type: 'boolean' },
      cookieMonsterEnabled: { type: 'boolean' },
      cmNonTrackerEnabled: { type: 'boolean' },
      cmSessionEnabled: { type: 'boolean' },
      affected: { type: 'boolean' }
    }
  }
}];
