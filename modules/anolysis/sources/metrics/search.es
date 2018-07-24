/* eslint-disable quote-props */
// sub results
import {
  ANCHOR_RESULT,
  HISTORY_RESULT,
  IMAGE_RESULT,
  INTERNAL_RESULT,
  LIVE_TICKER_RESULT,
  MOVIE_INFO_RESULT,
  NEWS_RESULT,
  SOCIAL_RESULT
} from './search/result-types';

// adapted from https://github.com/dominiks-cliqz/event-log/blob/logutils/logutils/logutils/encode/result_sources.py
const RESULT_SOURCE_MAP = {
  'history': {
    'C': 'Cluster',
    'H': 'History',
  },
  'backend': {
    'm': 'Generic',
    'X': 'SmartCliqz',
    'n': 'News',
    'h': 'Wikipedia',
    'r': 'Recipe',
    'v': 'Video',
    'p': 'People',
    'c': 'Census',
    'k': 'Science',
    'l': 'Dictionary',
    'q': 'Qaa',
    's': 'Shopping',
    'g': 'Game',
    'o': 'Movie',
  },
  'default-search': {
    'default-search': 'Default search engine',
  },
  'custom-search': {
    'custom-search': 'Custom search engine',
  },
  'navigation': {
    'navigate-to': 'Direct URL',
  },
  'query-suggestion': {
    'Z': 'Query suggestion'
  },
};

const RESULT_SOURCES = Object.keys(RESULT_SOURCE_MAP)
  .map(key => Object.keys(RESULT_SOURCE_MAP[key]))
  .reduce((acc, cur) => acc.concat(cur));

const RESULT_CLASSES = [
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
];

const SELECTION_ACTIONS = [
  'click',
  'enter',
];

const SELECTION_ELEMENTS = [
  '',
  'description',
  'full-url',
  'image',
  'logo',
  'map-image',
  'title',
  'url',
];

const SELECTION_ORIGINS = [
  'cliqz',
  'other',
  'direct'
];

const SELECTION_SUB_RESULT_TYPES = [
  ANCHOR_RESULT,
  HISTORY_RESULT,
  IMAGE_RESULT,
  INTERNAL_RESULT,
  LIVE_TICKER_RESULT,
  MOVIE_INFO_RESULT,
  NEWS_RESULT,
  SOCIAL_RESULT,
];

const mkResultSchema = () => ({
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

export default [
  {
    name: 'search.session',
    schema: {
      required: ['version', 'hasUserInput', 'results'],
      properties: {
        version: { type: 'integer', value: 2 },
        hasUserInput: { type: 'boolean' },
        // results as in last results shown
        results: {
          type: 'array',
          items: {
            type: 'object',
            required: [],
            properties: {
              ...mkResultSchema(),
            },
          },
        },
        // selected result
        selection: {
          required: [],
          properties: {
            action: { type: 'string', enum: SELECTION_ACTIONS },
            element: { type: 'string', enum: SELECTION_ELEMENTS },
            index: { type: 'integer', minimum: 0 },
            isAutocomplete: { type: 'boolean' },
            ...mkResultSchema(),
            origin: { type: 'string', enum: SELECTION_ORIGINS },
            queryLength: { type: 'integer', minimum: 0 },
            // TODO: could be moved to `results`
            showTime: { type: 'integer', minimum: 0 },
            subResult: {
              required: [],
              properties: {
                type: { type: 'string', enum: SELECTION_SUB_RESULT_TYPES },
                index: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
    },
  },
  {
    name: 'metrics.search.latency',
    // instant push
    sendToBackend: true,
    version: 1,
    schema: {
      required: ['backend', 'latency'],
      properties: {
        // add all available backends to enum
        backend: { type: 'string', enum: ['de', 'us', 'fr', 'uk', 'es', 'it'] },
        latency: {
          required: [],
          properties: {
            // in 20ms steps until 199ms
            // < 20ms
            0: { type: 'integer', minimum: 0 },
            20: { type: 'integer', minimum: 0 },
            40: { type: 'integer', minimum: 0 },
            60: { type: 'integer', minimum: 0 },
            80: { type: 'integer', minimum: 0 },
            100: { type: 'integer', minimum: 0 },
            120: { type: 'integer', minimum: 0 },
            140: { type: 'integer', minimum: 0 },
            160: { type: 'integer', minimum: 0 },
            180: { type: 'integer', minimum: 0 },
            200: { type: 'integer', minimum: 0 },
            // in 100ms steps until 999ms
            300: { type: 'integer', minimum: 0 },
            400: { type: 'integer', minimum: 0 },
            500: { type: 'integer', minimum: 0 },
            600: { type: 'integer', minimum: 0 },
            700: { type: 'integer', minimum: 0 },
            800: { type: 'integer', minimum: 0 },
            900: { type: 'integer', minimum: 0 },
            // >= 1000ms
            rest: { type: 'integer', minimum: 0 },
          }
        },
      }
    },
  },
];

// TODO: move to central file?
export { RESULT_SOURCE_MAP };

