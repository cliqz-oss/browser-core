export default [
  {
    name: 'analyses.experiments.serp',
    version: 1,
    needsGid: false,
    sendToBackend: true,
    generate: ({ records }) => {
      const stateSignals = records.get('metrics.experiments.serp.state');

      if (stateSignals.length === 0) {
        return [];
      }

      // use values from last state signal on a day
      const lastStateSignal = stateSignals[stateSignals.length - 1];
      const { group, isCliqzDefaultEngine } = lastStateSignal;

      const showSignals = records.get('metrics.experiments.serp.show');
      const resultClickSignals =
        records.get('metrics.experiments.serp.click.result');
      const searchClickSignals =
        records.get('metrics.experiments.serp.click.search');
      // see also 'search.session' analysis
      const dropdownSelections = records.get('search.session')
        .filter(({ hasUserInput }) => hasUserInput)
        .map(({ selection = [] }) => selection);
      const cliqzSelections =
        dropdownSelections.filter(s => s.origin === 'cliqz');
      const directSelections =
        dropdownSelections.filter(s => s.origin === 'direct');

      return [{
        group,
        isCliqzDefaultEngine,
        dropdownSelections: {
          cliqz: {
            total: cliqzSelections.length,
            isSearchEngine: cliqzSelections
              .filter(({ isSearchEngine }) => isSearchEngine).length,
          },
          direct: {
            total: directSelections.length,
            isSearchEngine: directSelections
              .filter(({ isSearchEngine }) => isSearchEngine).length,
          },
          other: dropdownSelections.filter(s => s.origin === 'other').length,
          abandoned: dropdownSelections.filter(s => s.origin === null).length,
        },
        serpSelections: {
          result: resultClickSignals
            .filter(({ source }) => source === 'm').length,
          suggestion: resultClickSignals
            .filter(({ source }) => source === 'Z').length,
          other: searchClickSignals.length,
          abandoned: showSignals.length -
            (resultClickSignals.length + searchClickSignals.length),
        },
      }];
    },
    schema: {
      // AB test group this user is in
      group: { enum: ['A', 'B', 'C', null] },
      // true, if Cliqz is (still) the default search engine (users can change)
      isCliqzDefaultEngine: { type: 'boolean' },
      // 'dropdown' is a reduced version of the 'search.sessions' analysis
      dropdownSelections: {
        cliqz: {
          total: { type: 'integer', minimum: 0 },
          // number of times the user selected a Cliqz result leading to a
          // search engine (like Google)
          isSearchEngine: { type: 'integer', minimum: 0 },
        },
        direct: {
          total: { type: 'integer', minimum: 0 },
          // number of times the user typed a search engine URL (like Google)
          isSearchEngine: { type: 'integer', minimum: 0 },
        },
        other: { type: 'integer', minimum: 0 },
        abandoned: { type: 'integer', minimum: 0 },
      },
      serpSelections: {
        // number of times a user selected a SERP result
        result: { type: 'integer', minimum: 0 },
        // number of times a user selected a SERP query suggestion
        suggestion: { type: 'integer', minimum: 0 },
        // number of times a user selected the "Google" option at the bottom
        other: { type: 'integer', minimum: 0 },
        // number of times the SERP was shown but the user didn't select anything
        abandoned: { type: 'integer', minimum: 0 },
      },
    }
  },
];
