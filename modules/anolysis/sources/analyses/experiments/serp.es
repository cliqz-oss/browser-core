import { mkHistogramSchema } from '../search';
import integersToHistogram from '../../../core/helpers/histogram';

export default [
  {
    name: 'analyses.experiments.serp',
    version: 2,
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
      const serpShowSignals =
        records.get('metrics.experiments.serp.show');
      const resultClickSignals =
        records.get('metrics.experiments.serp.click.result');
      const searchClickSignals =
        records.get('metrics.experiments.serp.click.search');
      const searchEnterSignals =
        records.get('metrics.experiments.serp.enter.search');
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
        serpShows: {
          views: {
            landing: serpShowSignals.filter(s => s.view === 'landing').length,
            results: serpShowSignals.filter(s => s.view === 'results').length,
          },
        },
        serpSelections: {
          result: {
            total: resultClickSignals
              .filter(({ source }) => source === 'm').length,
            isSearchEngine: resultClickSignals
              .filter(({ source, isSearchEngine }) => source === 'm' && isSearchEngine).length,
            index: integersToHistogram(resultClickSignals
              .filter(({ source }) => source === 'm')
              .map(({ index }) => index)
            ),
          },
          suggestion: resultClickSignals
            .filter(({ source }) => source === 'Z').length,
          other: searchClickSignals.filter(({ engine }) => engine !== 'cliqz').length,
          abandoned: {
            views: {
              landing: showSignals.filter(({ view }) => view === 'landing').length -
                searchClickSignals.filter(({ view }) => view === 'landing').length -
                searchEnterSignals.filter(({ view }) => view === 'landing').length,
              results: showSignals.filter(({ view }) => view === 'results').length -
                resultClickSignals.filter(({ view }) => view === 'results').length -
                searchClickSignals.filter(({ view }) => view === 'results').length -
                searchEnterSignals.filter(({ view }) => view === 'results').length,
            },
          },
          // showSignals.length -
          //   (resultClickSignals.length + searchClickSignals.length),
          query: {
            views: {
              landing: searchClickSignals
                .filter(({ engine, view }) => engine === 'cliqz' && view === 'landing').length +
                searchEnterSignals.filter(({ view }) => view === 'landing').length,
              results: searchClickSignals
                .filter(({ engine, view }) => engine === 'cliqz' && view === 'results').length +
                searchEnterSignals.filter(({ view }) => view === 'results').length,
            },
          },
        },
      }];
    },
    schema: {
      required: ['group', 'isCliqzDefaultEngine', 'dropdownSelections', 'serpShows', 'serpSelections'],
      properties: {
        // AB test group this user is in
        group: { enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', null] },
        // true, if Cliqz is (still) the default search engine (users can change)
        isCliqzDefaultEngine: { type: 'boolean' },
        // 'dropdown' is a reduced version of the 'search.sessions' analysis
        dropdownSelections: {
          required: ['cliqz', 'direct', 'other', 'abandoned'],
          properties: {
            cliqz: {
              required: ['total', 'isSearchEngine'],
              properties: {
                total: { type: 'integer', minimum: 0 },
                // number of times the user selected a Cliqz result leading to a
                // search engine (like Google)
                isSearchEngine: { type: 'integer', minimum: 0 },
              },
            },
            direct: {
              required: ['total', 'isSearchEngine'],
              properties: {
                total: { type: 'integer', minimum: 0 },
                // number of times the user typed a search engine URL (like Google)
                isSearchEngine: { type: 'integer', minimum: 0 },
              },
            },
            other: { type: 'integer', minimum: 0 },
            abandoned: { type: 'integer', minimum: 0 },
          },
        },
        serpShows: {
          required: ['views'],
          properties: {
            views: {
              required: ['landing', 'results'],
              properties: {
                // number of times the (empty) SERP with the center URL bar was shown
                landing: { type: 'integer', minimum: 0 },
                // number of times SERP with with (or without) results was shown (top URL bar)
                results: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
        serpSelections: {
          required: ['result', 'suggestion', 'other', 'abandoned'],
          properties: {
            // number of times a user selected a SERP result
            result: {
              required: ['total', 'isSearchEngine', 'index'],
              properties: {
                total: { type: 'integer', minimum: 0 },
                // number of times the user selected a Cliqz result leading to a search engine
                // (like Google)
                isSearchEngine: { type: 'integer', minimum: 0 },
                // histogram of selected result indices
                index: {
                  ...mkHistogramSchema(16),
                },
              },
            },
            // number of times a user selected a SERP query suggestion
            suggestion: { type: 'integer', minimum: 0 },
            // number of times a user selected the "Google" option at the bottom
            other: { type: 'integer', minimum: 0 },
            // number of times the SERP was shown but the user didn't select anything
            abandoned: {
              required: ['views'],
              properties: {
                views: {
                  required: ['landing', 'results'],
                  properties: {
                    // on SERP with the center URL bar was shown
                    landing: { type: 'integer', minimum: 0 },
                    // on SERP with with (or without) results was shown (top URL bar)
                    results: { type: 'integer', minimum: 0 },
                  },
                },
              },
            },
            query: {
              required: ['views'],
              views: {
                properties: {
                  required: ['landing', 'results'],
                  properties: {
                    // on SERP with the center URL bar was shown
                    landing: { type: 'integer', minimum: 0 },
                    // on SERP with with (or without) results was shown (top URL bar)
                    results: { type: 'integer', minimum: 0 },
                  },
                },
              },
            },
          },
        },
      }
    },
  },
];
