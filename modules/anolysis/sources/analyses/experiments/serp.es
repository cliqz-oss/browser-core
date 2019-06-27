import { mkHistogramSchema } from '../search';
import integersToHistogram from '../../../core/helpers/histogram';

const PREF = 'experiments.serp';

const isWithUserInput = session =>
  session.some(signal => signal.name === 'metrics.experiments.serp.type');

const isWithAnySuggestions = session =>
  session.some(signal =>
    signal.name === 'metrics.experiments.serp.type' && signal.hasSuggestions);

const isWithFinalSuggestions = (session) => {
  // lastSignals should be 'type' signals if any
  const lastSignal = session.pop(); // session should have at least one signal
  return lastSignal.name === 'metrics.experiments.serp.type' && lastSignal.hasSuggestions;
};

const isAbandonedSession = session =>
  session.every(signal => signal.name === 'metrics.experiments.serp.show');

// Only one view signal per session
const isLandingAbandonedSession = session =>
  isAbandonedSession(session) && session.findIndex(signal => signal.view === 'landing') !== -1;
const isResultsAbandonedSession = session =>
  isAbandonedSession(session) && session.findIndex(signal => signal.view === 'results') !== -1;

// All signals must have a session id
const groupBySession = (signals) => {
  const aggregated = {};
  signals.forEach((signal) => {
    const session = aggregated[signal.session];
    if (!session) {
      aggregated[signal.session] = [signal];
    } else {
      session.push(signal);
    }
  });
  return aggregated;
};

const countSessions = (selector, sessions) => Object.values(sessions).reduce((acc, session) =>
  (acc + (selector(session) ? 1 : 0)), 0);

export default () => [
  {
    name: 'analyses.experiments.serp',
    version: 5,
    needsGid: false,
    sendToBackend: true,
    generate: ({ records }) => {
      const stateSignals = records.get('metrics.experiments.serp.state');

      if (stateSignals.length === 0) {
        return [];
      }

      // check if there is a SERP AB test running using Aristotle;
      // if so, take group and ID from this test
      let id;
      let group;
      const testSignals = records.get('metrics.core.abtests');
      if (testSignals.length > 0) {
        // there should alway be only one matching AB test metric per day;
        [{ id, group } = {}] = testSignals[0]
          // determine if user is in AB test based on pref it sets
          .filter(({ groups: { A = {}, B = {} } = {} } = {}) =>
            Object.prototype.hasOwnProperty.call(A, PREF)
            || Object.prototype.hasOwnProperty.call(B, PREF));
      }

      // use values from last state signal on a day
      const lastStateSignal = stateSignals[stateSignals.length - 1];
      const isCliqzDefaultEngine = lastStateSignal.isCliqzDefaultEngine;

      // no new AB test, take value from hardcoded test
      if (!id || !group) {
        id = null;
        group = lastStateSignal.group;
      }

      const serpShowSignals = records
        .get('metrics.experiments.serp.show')
        .map(signal => ({ ...signal, name: 'metrics.experiments.serp.show' }));

      const serpTypeSignals = records
        .get('metrics.experiments.serp.type')
        .map(signal => ({ ...signal, name: 'metrics.experiments.serp.type' }));

      const resultClickSignals = records.get('metrics.experiments.serp.click.result');
      const searchClickSignals = records.get('metrics.experiments.serp.click.search');
      const searchEnterSignals = records.get('metrics.experiments.serp.enter.search');
      // see also 'search.session' analysis
      const dropdownSelections = records.get('search.session')
        .filter(({ hasUserInput }) => hasUserInput)
        .map(({ selection = [] }) => selection);
      const cliqzSelections = dropdownSelections.filter(s => s.origin === 'cliqz');
      const directSelections = dropdownSelections.filter(s => s.origin === 'direct');

      const showSignalsBySession = groupBySession(serpShowSignals.concat(serpTypeSignals));
      const abandonedSignalsBySession = groupBySession(
        serpShowSignals.concat(resultClickSignals, searchClickSignals, searchEnterSignals)
      );

      const withUserInputCount = countSessions(isWithUserInput, showSignalsBySession);
      const withAnySuggestionsCount = countSessions(isWithAnySuggestions, showSignalsBySession);
      const withFinalSuggestionsCount = countSessions(isWithFinalSuggestions, showSignalsBySession);
      const totalSignalsCount = Object.keys(showSignalsBySession).length;

      return [{
        experiment: id,
        group: group || null,
        isCliqzDefaultEngine: !!isCliqzDefaultEngine,
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
          withOffer: serpShowSignals.filter(s => s.offerCount > 0).length,
          views: {
            landing: serpShowSignals.filter(s => s.view === 'landing').length,
            results: serpShowSignals.filter(s => s.view === 'results').length,
          },
          withUserInput: {
            true: withUserInputCount,
            false: totalSignalsCount - withUserInputCount,
          },
          withAnySuggestions: {
            true: withAnySuggestionsCount,
            false: totalSignalsCount - withAnySuggestionsCount,
          },
          withFinalSuggestions: {
            true: withFinalSuggestionsCount,
            false: totalSignalsCount - withFinalSuggestionsCount,
          },
        },
        serpSelections: {
          result: {
            // note: "class" referes to the RichHeader class (e.g., "EntityGeneric")
            total: resultClickSignals
              .filter(({ source, class: c }) => source === 'm' && !c).length,
            isSearchEngine: resultClickSignals
              .filter(({ source, class: c, isSearchEngine }) => source === 'm' && !c && isSearchEngine).length,
            index: integersToHistogram(
              resultClickSignals
                .filter(({ source, class: c }) => source === 'm' && !c)
                .map(({ index }) => index)
            ),
          },
          suggestion: resultClickSignals
            .filter(({ source }) => source === 'Z').length,
          offer: resultClickSignals
            .filter(({ source, class: c }) => source === 'm' && c === 'EntityKPI').length,
          other: searchClickSignals.filter(({ engine }) => engine !== 'cliqz').length,
          abandoned: {
            views: {
              landing: countSessions(isLandingAbandonedSession, abandonedSignalsBySession),
              results: countSessions(isResultsAbandonedSession, abandonedSignalsBySession),
            },
          },
          query: {
            views: {
              landing: searchClickSignals
                .filter(({ engine, view }) => engine === 'cliqz' && view === 'landing').length
                + searchEnterSignals.filter(({ view }) => view === 'landing').length,
              results: searchClickSignals
                .filter(({ engine, view }) => engine === 'cliqz' && view === 'results').length
                + searchEnterSignals.filter(({ view }) => view === 'results').length,
            },
          },
        },
      }];
    },
    schema: {
      required: ['experiment', 'group', 'isCliqzDefaultEngine', 'dropdownSelections', 'serpShows', 'serpSelections'],
      properties: {
        // get test ID/name from (new) AB testing framework via 'metrics.core.abtests' (find test
        // that sets 'extensions.cliqz.experiments.serp'); for the ongoing SERP AB tests, which are
        // hardcoded, set to `null`
        experiment: { anyOf: [
          { type: 'integer', minimum: 0 },
          { type: 'null' },
        ] },
        // AB test group this user is in
        group: { enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', null] },
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
          required: ['views', 'withOffer', 'withUserInput', 'withAnySuggestions', 'withFinalSuggestions'],
          properties: {
            withOffer: { type: 'integer', minimum: 0 },
            views: {
              required: ['landing', 'results'],
              properties: {
                // number of times the (empty) SERP with the center URL bar was shown
                landing: { type: 'integer', minimum: 0 },
                // number of times SERP with with (or without) results was shown (top URL bar)
                results: { type: 'integer', minimum: 0 },
              },
            },
            withUserInput: {
              required: ['true', 'false'],
              properties: {
                // number of times the (empty) SERP with the center URL bar was shown
                true: { type: 'integer', minimum: 0 },
                // number of times SERP with with (or without) results was shown (top URL bar)
                false: { type: 'integer', minimum: 0 },
              },
            },
            withAnySuggestions: {
              required: ['true', 'false'],
              properties: {
                // number of times the (empty) SERP with the center URL bar was shown
                true: { type: 'integer', minimum: 0 },
                // number of times SERP with with (or without) results was shown (top URL bar)
                false: { type: 'integer', minimum: 0 },
              },
            },
            withFinalSuggestions: {
              required: ['true', 'false'],
              properties: {
                // number of times the (empty) SERP with the center URL bar was shown
                true: { type: 'integer', minimum: 0 },
                // number of times SERP with with (or without) results was shown (top URL bar)
                false: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
        serpSelections: {
          required: ['result', 'suggestion', 'offer', 'other', 'abandoned'],
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
            // number of times a user selected an offer
            offer: { type: 'integer', minimum: 0 },
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
