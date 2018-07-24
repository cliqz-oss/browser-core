/**
 * freshtab-state informs us about how many of our users have freshtab enabled.
 */
export default {
  name: 'freshtab-state',
  version: 1,
  needsGid: true,
  generate: ({ records }) => {
    const freshtabStateSignals = records.get('freshtab.prefs.state');

    if (freshtabStateSignals.length === 0) {
      return [];
    }

    return [{
      is_freshtab_on: freshtabStateSignals[freshtabStateSignals.length - 1].active,
    }];
  },
  schema: {
    required: ['is_freshtab_on'],
    properties: {
      is_freshtab_on: { type: 'boolean' },
    },
  }
};
