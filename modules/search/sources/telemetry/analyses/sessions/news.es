/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable camelcase */

import integersToHistogram from '../../../../core/helpers/histogram';
import { mkCountSchema, isClickAction, isEnterAction,
  isAutocompleteAction, mkHistogramSchema, historySources } from '../../helpers';

// News SmartCliqz could contain diffrent types of elements (sub results)
// NEWS_RESULT: 'news': news are shown in list
// INTERNAL_RESULT: 'internal': category of news domain
// BREAKING_NEWS_RESULT: 'breaking_news' : breaking news
import {
  NEWS_RESULT,
  INTERNAL_RESULT,
  HISTORY_RESULT,
  BREAKING_NEWS_RESULT,
} from '../../result-types';

// news stories of the day source key from "RESULT_SOURCE_MAP"
const nsdSource = 'n';
// Smart Cliqz source key
const scSource = 'X';
const scEntityNews = 'EntityNews';
const scEntityTopNews = 'EntityTopNews';

// Only if NSD related results
const isNsd = ({ sources = [] }) => sources.includes(nsdSource);
const hasNsdResults = results => results.some(isNsd);

// Only if SC news related results
const isNewsSC = ({ sources = [], classes = [] }) =>
  sources.includes(scSource) && classes.includes(scEntityNews);
const hasNewsSCResults = results => results.some(isNewsSC);

// Only if TOP NEWS SC related results
const isTopNewsSC = ({ sources = [], classes = [] }) =>
  sources.includes(scSource) && classes.includes(scEntityTopNews);
const hasTopNewsSCResults = results => results.some(isTopNewsSC);

// History filtering ( may contain other sources as well )
const isHistory = ({ sources = [] }) =>
  sources.some(source => historySources.has(source));
// History only
const isHistoryOnly = ({ sources = [] }) =>
  sources.every(source => historySources.has(source));

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

// match selection based on sources and classes,
// targetSubResults is ana array of target subresult type
const subResultSelectionsFilter = targetSubResults => ({ subResult = {} }) =>
  targetSubResults.includes(subResult.type);

// if the subResult of selection is empty --- for detecting otherHistory and domainTitleHistory
const emptySubResultSelectionsFilter = ({ subResult = {} }) =>
  Object.keys(subResult).length === 0 && subResult.constructor === Object;

// selections filter based on 'filterFunction'
const selectionsFilter = (sessions, filterFunction) =>
  sessions.filter(({ selection = [] }) => filterFunction(selection))
    .map(({ selection = [] }) => selection);
/*
 * news-search allows us to know how our users interact with our news in search
 * there are main two types of news in the search results,
 * NSD: news stories of the day, news search results triggred by terms
 * SC: smart cliqz news is triggred by domain names
 * topNewsSC: smart cliqz top news is triggred by type top news ....
 * news-search analysis depends on search metric "search.metric.session.interaction"
 * and search analysis
*/
export default {
  name: 'search.analysis.sessions.news',
  sendToBackend: {
    version: 3,
    demographics: [
      'country',
      'product',
      'extension',
    ],
  },
  generate: ({ records }) => {
    // Using the same search metric for news analysis
    const signals = records.get('search.metric.session.interaction');
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
    // match with only selected subResult types: news/ category/ breaking news
    const scNewsSelections = selectionsFilter(scNewsSessions, isNewsSC)
      .filter(subResultSelectionsFilter([NEWS_RESULT, INTERNAL_RESULT, BREAKING_NEWS_RESULT]));
    // const scNewsSelections = selectionsFilter(scNewsSessions, isNewsSC);

    // There are three types of History could be shown while news smart cliqz is triggred
    /**
    history: number selected history inside the smart cliqz ex: spiegel urls in the smart cliqz
    domainHistory: number of selections on title, ex: selecting spiegel.de on smart cliqz
    otherHistory: selections of other history results, ex: history cluster, urls of news-swimlane
    */
    // selected history inside the smart cliqz
    // Conditions: sources contain smart cliqz and history ['X', 'H']
    // and subresult contains history
    const scNewsHistorySelections = selectionsFilter(scNewsSessions, isHistory)
      .filter(isNewsSC).filter(subResultSelectionsFilter([HISTORY_RESULT]));

    // selected domain name if it was in history
    // Conditions: sources contains smart cliqz and history ['X', 'H'] and subresult is empty
    const scDomainNewsHistorySelections = selectionsFilter(scNewsSessions, isHistory)
      .filter(isNewsSC).filter(emptySubResultSelectionsFilter);

    // other history results, outside news sc ...
    // Conditions: sources contains history only ['X', 'H'] and subresult will be empty by default
    const scOtherNewsHistorySelections = selectionsFilter(scNewsSessions, isHistoryOnly);

    // indices of SC itself in all results
    const scNewsSelectionsIndices = scNewsSelections
      .reduce((r = [], { index }) => r.concat(index), []);

    // selections inside sc (subResults)
    const scNewsSubResultSelectionsNews = scNewsSelections
      .filter(({ subResult }) => subResult.type === NEWS_RESULT);
    const scNewsSubResultSelectionsCategory = scNewsSelections
      .filter(({ subResult }) => subResult.type === INTERNAL_RESULT);
    const scNewsSubResultSelectionsBreakingNews = scNewsSelections
      .filter(({ subResult }) => subResult.type === BREAKING_NEWS_RESULT);

    // indices of news inside sc
    const scNewsSubResultSelectionsNewsIndices = getSelectionsSubResultSCIndices(
      scNewsSelections,
      NEWS_RESULT
    );
    // indices of categories inside sc
    const scNewsSubResultSelectionsCategoriesIndices = getSelectionsSubResultSCIndices(
      scNewsSelections,
      INTERNAL_RESULT
    );

    // TOP NEWS SMART CLIQZ EntityTopNews
    // SC: filter TOP news sc sessions
    const scTopNewsSessions = sessions.filter(({ results }) => hasTopNewsSCResults(results));
    const scTopNewsResults = scTopNewsSessions
      .map(({ results: r = [] }) => r)
      .filter(r => r.length > 0);

    const scTopNewsResultsWithHistory = scTopNewsResults.filter(hasHistoryResults);

    // sc top news indices
    const scTopNewsResultsIndices = scTopNewsResults
      .map((r = []) => getResultsIndices(r, isTopNewsSC))
      .reduce((r = [], indices) => r.concat(indices), []);

    // sc top news selections
    const scTopNewsSelections = selectionsFilter(scTopNewsSessions, isTopNewsSC)
      .filter(subResultSelectionsFilter([NEWS_RESULT, BREAKING_NEWS_RESULT]));

    // history selections while top news sc was shown (History Cluster)
    const scTopOtherNewsHistorySelections = selectionsFilter(scTopNewsSessions, isHistoryOnly);

    // indices of SC itself in all results
    const scTopNewsSelectionsIndices = scTopNewsSelections
      .reduce((r = [], { index }) => r.concat(index), []);

    // selections inside sc (subResults)
    const scTopNewsSubResultSelectionsNews = scTopNewsSelections
      .filter(({ subResult }) => subResult.type === NEWS_RESULT);
    const scTopNewsSubResultSelectionsBreakingNews = scTopNewsSelections
      .filter(({ subResult }) => subResult.type === BREAKING_NEWS_RESULT);

    // indices of news inside sc
    const scTopNewsSubResultSelectionsNewsIndices = getSelectionsSubResultSCIndices(
      scTopNewsSelections,
      NEWS_RESULT
    );


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
          domainHistory: scDomainNewsHistorySelections.length,
          otherHistory: scOtherNewsHistorySelections.length,
          index: integersToHistogram(scNewsSelectionsIndices, { binSize: 1, binCount: 16 }),
          subResult: {
            news: {
              total: scNewsSubResultSelectionsNews.length,
              index: integersToHistogram(
                scNewsSubResultSelectionsNewsIndices,
                { binSize: 1, binCount: 16 }
              ),
            },
            category: {
              total: scNewsSubResultSelectionsCategory.length,
              index: integersToHistogram(
                scNewsSubResultSelectionsCategoriesIndices,
                { binSize: 1, binCount: 16 }
              ),
            },
            breaking: scNewsSubResultSelectionsBreakingNews.length,
          },
          action: {
            autocomplete: scNewsSelections
              .filter(isAutocompleteAction).length,
            click: scNewsSelections.filter(isClickAction).length,
            enter: scNewsSelections.filter(isEnterAction).length,
          },
        }
      },
      scTopNews: {
        results: {
          total: scTopNewsResults.length,
          index: integersToHistogram(scTopNewsResultsIndices, { binSize: 1, binCount: 16 }),
          withHistory: scTopNewsResultsWithHistory.length,
        },
        selections: {
          total: scTopNewsSelections.length,
          history: scTopOtherNewsHistorySelections.length,
          index: integersToHistogram(scTopNewsSelectionsIndices, { binSize: 1, binCount: 16 }),
          subResult: {
            news: {
              total: scTopNewsSubResultSelectionsNews.length,
              index: integersToHistogram(scTopNewsSubResultSelectionsNewsIndices,
                { binSize: 1, binCount: 16 }),
            },
            breaking: scTopNewsSubResultSelectionsBreakingNews.length,
          },
          action: {
            autocomplete: scTopNewsSelections
              .filter(isAutocompleteAction).length,
            click: scTopNewsSelections.filter(isClickAction).length,
            enter: scTopNewsSelections.filter(isEnterAction).length,
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
              ...mkCountSchema('domainHistory'),
              ...mkCountSchema('total'),
              ...mkCountSchema('history'),
              ...mkCountSchema('otherHistory'),
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
                  },
                  ...mkCountSchema('breaking'),
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
      },
      scTopNews: {
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
                  ...mkCountSchema('breaking'),
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
};
