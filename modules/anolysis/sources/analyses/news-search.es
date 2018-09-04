/* eslint-disable camelcase */

import integersToHistogram from '../../core/helpers/histogram';
import { mkCountSchema, isClickAction, isEnterAction,
  isAutocompleteAction, mkHistogramSchema, historySources } from './search';

// News SmartCliqz could contain diffrent types of elements (sub results)
// NEWS_RESULT: 'news': news are shown in list
// INTERNAL_RESULT: 'internal': category of news domain
import {
  NEWS_RESULT,
  INTERNAL_RESULT,
} from '../metrics/search/result-types';

// news stories of the day source key from "RESULT_SOURCE_MAP"
const nsdSource = 'n';
// Smart Cliqz source key
const scSource = 'X';
const scEntityNews = 'EntityNews';

// Only if NSD related results
const isNsd = ({ sources = [] }) => sources.includes(nsdSource);
const hasNsdResults = results => results.some(isNsd);

// Only if SC news related results
const isNewsSC = ({ sources = [], classes = [] }) =>
  sources.includes(scSource) && classes.includes(scEntityNews);
const hasNewsSCResults = results => results.some(isNewsSC);

// History filtering
const isHistory = ({ sources = [] }) =>
  sources.some(source => historySources.has(source));

const hasHistoryResults = results => results.some(isHistory);

// return indices of results of a specific type defined by 'resultTypeFunction'
const getResultsIndices = (results, resultTypeFunction) => {
  const r = [];
  results.forEach((result, index) => {
    if (resultTypeFunction(result)) {
      r.push(index);
    }
  });
  return r;
};
// return selections only with specific subresult type
const getSelectionsSubResultSCIndices = (selections, subResultKey) =>
  selections
    .filter(({ subResult }) => subResult.type === subResultKey)
    .reduce((r = [], { subResult }) => r.concat(subResult.index), []);

// selections filter based on 'filterFunction'
const selectionsFilter = (sessions, filterFunction) =>
  sessions.filter(({ selection = [] }) => filterFunction(selection))
    .map(({ selection = [] }) => selection);
/*
 * news-search allows us to know how our users interact with our news in search
 * there are main two types of news in the search results,
 * NSD: news stories of the day, news search results triggred by terms
 * SC: smart cliqz news is triggred by domain names
 * news-search analysis depends on search metric "search.session" and search analysis
*/
export default [
  {
    name: 'news-search',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    generate: ({ records }) => {
      // Using the same search metric for news analysis
      const signals = records.get('search.session');
      if (signals.length === 0) {
        return [];
      }
      // all sessions
      const sessions = signals.filter(({ hasUserInput }) => hasUserInput);

      // NSD: filter nsd sessions
      const nsdSessions = sessions.filter(({ results }) => hasNsdResults(results));
      const nsdResults = nsdSessions
        .map(({ results: r = [] }) => r)
        .filter(r => r.length > 0);

      // nsd indices
      const nsdResultsIndices = nsdResults.map((r = []) => getResultsIndices(r, isNsd))
        .reduce((r = [], indices) => r.concat(indices), []);

      // size of group getting news results displayed in dropdown
      // EX: number of results displayed in each session.
      //  results: [
      //    [
      //      // 1st result (item)
      //      {
      //        sources: [...]
      //      },
      //      {
      //      // 2nd result (item)
      //        sources: [...]
      //      },
      //      ...
      //    ] .....
      //  ]
      const nsdResultsSize = nsdResults.reduce((r = [], { length }) => r.concat(length), []);

      // nsd selections
      const nsdSelections = selectionsFilter(nsdSessions, isNsd);

      const nsdSelectionsIndices = nsdSelections
        .reduce((r = [], { index }) => r.concat(index), []);

      // SC: filter news sc sessions
      const scNewsSessions = sessions.filter(({ results }) => hasNewsSCResults(results));
      const scNewsResults = scNewsSessions
        .map(({ results: r = [] }) => r)
        .filter(r => r.length > 0);

      const scNewsResultsWithHistory = scNewsResults.filter(hasHistoryResults);

      // sc news indices
      const scNewsResultsIndices = scNewsResults
        .map((r = []) => getResultsIndices(r, isNewsSC))
        .reduce((r = [], indices) => r.concat(indices), []);

      // sc news selections
      const scNewsSelections = selectionsFilter(scNewsSessions, isNewsSC);

      // history selections while news sc was shown
      const scNewsHistorySelections = selectionsFilter(scNewsSessions, isHistory);

      // indices of SC itself in all results
      const scNewsSelectionsIndices = scNewsSelections
        .reduce((r = [], { index }) => r.concat(index), []);

      // selections inside sc (subResults)
      const scNewsSubResultSelectionsNews = scNewsSelections
        .filter(({ subResult }) => subResult.type === NEWS_RESULT);
      const scNewsSubResultSelectionsCategory = scNewsSelections
        .filter(({ subResult }) => subResult.type === INTERNAL_RESULT);

      // indices of news inside sc
      const scNewsSubResultSelectionsNewsIndices =
        getSelectionsSubResultSCIndices(scNewsSelections, NEWS_RESULT);
      // indices of categories inside sc
      const scNewsSubResultSelectionsCategoriesIndices =
        getSelectionsSubResultSCIndices(scNewsSelections, INTERNAL_RESULT);

      return [{
        nsd: {
          results: {
            total: nsdResults.length,
            index: integersToHistogram(nsdResultsIndices, { binSize: 1, binCount: 16 }),
            size: integersToHistogram(nsdResultsSize, { binSize: 1, binCount: 16 }),
          },
          selections: {
            total: nsdSelections.length,
            index: integersToHistogram(nsdSelectionsIndices, { binSize: 1, binCount: 16 }),
            action: {
              autocomplete: nsdSelections
                .filter(isAutocompleteAction).length,
              click: nsdSelections.filter(isClickAction).length,
              enter: nsdSelections.filter(isEnterAction).length,
            },
          }
        },
        scNews: {
          results: {
            total: scNewsResults.length,
            index: integersToHistogram(scNewsResultsIndices, { binSize: 1, binCount: 16 }),
            withHistory: scNewsResultsWithHistory.length,
          },
          selections: {
            total: scNewsSelections.length,
            history: scNewsHistorySelections.length,
            index: integersToHistogram(scNewsSelectionsIndices, { binSize: 1, binCount: 16 }),
            subResult: {
              news: {
                total: scNewsSubResultSelectionsNews.length,
                index: integersToHistogram(scNewsSubResultSelectionsNewsIndices,
                  { binSize: 1, binCount: 16 }
                ),
              },
              category: {
                total: scNewsSubResultSelectionsCategory.length,
                index: integersToHistogram(scNewsSubResultSelectionsCategoriesIndices,
                  { binSize: 1, binCount: 16 }
                ),
              },
            },
            action: {
              autocomplete: scNewsSelections
                .filter(isAutocompleteAction).length,
              click: scNewsSelections.filter(isClickAction).length,
              enter: scNewsSelections.filter(isEnterAction).length,
            },
          }
        }
      }];
    },
    schema: {
      required: [],
      properties: {
        nsd: {
          required: [],
          properties: {
            results: {
              required: [],
              properties: {
                ...mkCountSchema('total'),
                index: { ...mkHistogramSchema(16) },
                size: { ...mkHistogramSchema(16) },
              }
            },
            selections: {
              required: [],
              properties: {
                ...mkCountSchema('total'),
                index: { ...mkHistogramSchema(16) },
                action: {
                  required: [],
                  properties: {
                    ...mkCountSchema('autocomplete'),
                    ...mkCountSchema('click'),
                    ...mkCountSchema('enter'),
                  }
                }
              }
            }
          },
        },
        scNews: {
          required: [],
          properties: {
            results: {
              required: [],
              properties: {
                ...mkCountSchema('total'),
                index: { ...mkHistogramSchema(16) },
                ...mkCountSchema('withHistory'),
              }
            },
            selections: {
              required: [],
              properties: {
                ...mkCountSchema('total'),
                ...mkCountSchema('history'),
                index: { ...mkHistogramSchema(16) },
                subResult: {
                  required: [],
                  properties: {
                    news: {
                      required: [],
                      properties: {
                        ...mkCountSchema('total'),
                        index: { ...mkHistogramSchema(16) },
                      }
                    },
                    category: {
                      required: [],
                      properties: {
                        ...mkCountSchema('total'),
                        index: { ...mkHistogramSchema(16) },
                      }
                    }
                  }
                },
                action: {
                  required: [],
                  properties: {
                    ...mkCountSchema('autocomplete'),
                    ...mkCountSchema('click'),
                    ...mkCountSchema('enter'),
                  }
                }
              }
            }
          },
        }
      },
    },
  },
];
