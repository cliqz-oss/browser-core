const PREF = 'experiments.dropdown.fullHeight';

export default [
  {
    name: 'analyses.experiments.dropdown.fullHeight',
    version: 1,
    needsGid: false,
    sendToBackend: true,
    generate: ({ records }) => {
      const testSignals = records.get('metrics.core.abtests');

      if (testSignals.length === 0) {
        return [];
      }

      // there should alway be only one AB test metric per day;
      const [{ group } = {}] = testSignals[0]
        // determine if user is in AB test based on pref it sets
        .filter(({ groups: { A = {}, B = {} } = {} } = {}) =>
          Object.prototype.hasOwnProperty.call(A, PREF)
          || Object.prototype.hasOwnProperty.call(B, PREF));

      if (!group) {
        return [];
      }

      // see also 'search.session' analysis
      const selections = records.get('search.session')
        .filter(({ hasUserInput }) => hasUserInput)
        .map(({ selection = [] }) => selection);

      return [{
        group,
        selections: {
          cliqz: selections.filter(s => s.origin === 'cliqz').length,
          direct: selections.filter(s => s.origin === 'direct').length,
          other: selections.filter(s => s.origin === 'other').length,
          abandoned: selections.filter(s => s.origin === null).length,
        },
      }];
    },
    schema: {
      required: ['group', 'selections'],
      properties: {
        // AB test group this user is in
        group: { type: 'string', enum: ['A', 'B'] },
        // reduced version of the 'search.sessions' analysis
        selections: {
          required: ['cliqz', 'direct', 'other', 'abandoned'],
          properties: {
            cliqz: { type: 'integer', minimum: 0 },
            direct: { type: 'integer', minimum: 0 },
            other: { type: 'integer', minimum: 0 },
            abandoned: { type: 'integer', minimum: 0 },
          },
        },
      }
    },
  },
];
