export default {
  name: 'analyses.freshtab.settings.background',
  version: 1,
  needsGid: false,
  generate: ({ records }) => {
    const freshtabConfigSignals = records.get('freshtab.prefs.config');
    if (freshtabConfigSignals.length === 0) {
      return [];
    }

    const {
      background: { index } = {},
    } = freshtabConfigSignals[freshtabConfigSignals.length - 1];

    if (index < 0 || index > 31) {
      return [{
        index: null
      }];
    }
    return [{
      index
    }];
  },
  schema: {
    required: ['index'],
    properties: {
      // index of selected background image
      index: { anyOf: [
        { type: 'integer', minimum: 0, maximum: 31 },
        { type: 'null' },
      ] },
    }
  },
};
