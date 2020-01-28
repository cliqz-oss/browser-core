
export default [{
  name: 'youtube-fixer.metric.cookieError',
  sendToBackend: {
    version: 1,
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
      statusCode: { type: 'number', min: 500 },
      cookies: { type: 'number', min: 0 },
      antitrackingEnabled: { type: 'boolean' },
      cookieMonsterEnabled: { type: 'boolean' },
      cmNonTrackerEnabled: { type: 'boolean' },
      cmSessionEnabled: { type: 'boolean' },
    }
  }
}];
