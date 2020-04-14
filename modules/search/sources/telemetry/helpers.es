/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  ANCHOR_RESULT,
  HISTORY_RESULT,
  IMAGE_RESULT,
  INTERNAL_RESULT,
  LIVE_TICKER_RESULT,
  MOVIE_INFO_RESULT,
  NEWS_RESULT,
  BREAKING_NEWS_RESULT,
  SOCIAL_RESULT,
} from './result-types';

// adapted from https://github.com/dominiks-cliqz/event-log/blob/logutils/logutils/logutils/encode/result_sources.py
export const RESULT_SOURCE_MAP = {
  history: {
    C: 'Cluster',
    H: 'History',
  },
  backend: {
    m: 'Generic',
    X: 'SmartCliqz',
    n: 'News',
    h: 'Wikipedia',
    r: 'Recipe',
    v: 'Video',
    p: 'People',
    c: 'Census',
    k: 'Science',
    l: 'Dictionary',
    q: 'Qaa',
    s: 'Shopping',
    g: 'Game',
    o: 'Movie',
  },
  'default-search': {
    'default-search': 'Default search engine',
  },
  navigation: {
    'navigate-to': 'Direct URL',
  },
  'query-suggestion': {
    Z: 'Query suggestion',
  },
  historyview: {
    'history-ui': 'History Search',
  },
};

export const RESULT_SOURCES = Object.keys(RESULT_SOURCE_MAP)
  .map(key => Object.keys(RESULT_SOURCE_MAP[key]))
  .reduce((acc, cur) => acc.concat(cur));

export const RESULT_CLASSES = [
  // SmartCliqzes
  'CliqzEZ',
  'EmergencyContactEZ',
  'EntityCurrency',
  'EntityDownload',
  'EntityFlight',
  'EntityGeneric',
  'EntityKPI',
  'EntityLocal',
  'EntityLotto',
  'EntityMovie',
  'EntityMusic',
  'EntityNews',
  'EntityTopNews',
  'EntityTime',
  'EntityVOD',
  'EntityVideo',
  'EntityWeather',
  'SoccerEZ',
  // search engines
  'Bing',
  'Cliqz',
  'DuckDuckGo',
  'Ecosia',
  'Google',
  'Qwant',
  'Start Page',
  // other values
  'other',
];

export const SELECTION_ACTIONS = [
  'click',
  'enter',
];

export const SELECTION_ELEMENTS = [
  '',
  'description',
  'full-url',
  'image',
  'logo',
  'map-image',
  'title',
  'url',
];

export const SELECTION_ORIGINS = [
  'cliqz',
  'other',
  'direct',
  null,
];

export const SELECTION_SUB_RESULT_TYPES = [
  ANCHOR_RESULT,
  HISTORY_RESULT,
  IMAGE_RESULT,
  INTERNAL_RESULT,
  LIVE_TICKER_RESULT,
  MOVIE_INFO_RESULT,
  NEWS_RESULT,
  BREAKING_NEWS_RESULT,
  SOCIAL_RESULT,
];

export const historySources = new Set(Object.keys(RESULT_SOURCE_MAP.history));

export const backendSources = new Set(Object.keys(RESULT_SOURCE_MAP.backend));

// merges array of objects into a single object
export const merge = array => array.reduce((acc, cur) => ({ ...acc, ...cur }));

export const mkCountSchema = key => ({ [key]: { type: 'integer', minimum: 0 } });

export const mkCountsSchema = keys => keys.map(mkCountSchema);

export const mkSourceSchema = () => ({
  source: {
    required: [],
    properties: {
      ...merge(
        mkCountsSchema(['history', 'backend', 'mixed'])
      ),
    },
  },
});

export const mkActionSchema = (additional = []) => ({
  action: {
    required: [],
    properties: {
      ...merge(
        mkCountsSchema(['click', 'enter', ...additional])
      ),
    },
  },
});

export const mkHistogramSchema = n => ({
  required: [],
  properties: {
    ...merge(
      Array.from(Array(n).keys())
        .map(mkCountSchema)
    ),
    ...mkCountSchema('rest'),
  },
});

export const hasHistorySources = sources =>
  sources.some(source => historySources.has(source));

export const hasBackendSources = sources =>
  sources.some(source => backendSources.has(source));

export const isAutocompleteAction = ({ action, isAutocomplete }) =>
  action === 'enter' && isAutocomplete;

export const isClickAction = ({ action }) => action === 'click';

export const isEnterAction = ({ action, isAutocomplete }) =>
  action === 'enter' && !isAutocomplete;

export const mapCliqzSources = (sources) => {
  const hasHistory = hasHistorySources(sources);
  const hasBackend = hasBackendSources(sources);

  return ({
    hasOnlyHistorySources: hasHistory && !hasBackend,
    hasOnlyBackendSources: !hasHistory && hasBackend,
    hasMixedSources: hasHistory && hasBackend,
  });
};

export const mkResultSchema = () => ({
  sources: {
    type: 'array',
    items: {
      type: 'string', enum: RESULT_SOURCES,
    },
  },
  classes: {
    type: 'array',
    items: {
      type: 'string', enum: RESULT_CLASSES,
    },
  },
});
