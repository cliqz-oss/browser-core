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
  BREAKING_NEWS_RESULT,
  SOCIAL_RESULT,
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
  BREAKING_NEWS_RESULT,
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

export default () => [
  {
    // A search session starts when the user indicates they want to start a new
    // search. On desktop, this is on URL bar focus. The session ends when the
    // user selected a result or abandoned the search. On desktop, this is on
    // URL bar blur; any result selection is included in the session as it
    // happens before the blur.
    //
    // Note: This is a metric. It is generally not sent to the backend directly
    // but it is aggregated in the corresponding 'search.sessions' analysis.
    name: 'search.session',
    schema: {
      required: ['version', 'hasUserInput', 'results'],
      properties: {
        // Signal version
        version: { type: 'integer', value: 3 },
        // True, if the user typed or pasted any characters
        hasUserInput: { type: 'boolean' },
        // One of the following possible search entry points:
        // - newTab: search started on new tab
        // - browserBar: search started in URL bar
        // - overlayByKeyboard: search started in overlay (using keyboard)
        // - overlayByMouse: search started in overlay (using mouse)
        entryPoint: { type: 'string',
          enum: ['newTab', 'browserBar', 'overlayByKeyboard', 'overlayByMouse'] },
        // Number of times the user highlighted (desktop) or swiped to a
        // result (mobile).
        highlightCount: { type: 'integer', minimum: 0 },
        // List of last results shown before making a selection or abandoning
        // the search. Empty if no results were shown. Each item corresponds to
        // one result. On desktop, this is one row in the dropdown. On mobile,
        // this is one card. Information per item:
        // - sources: sources of results that got mixed together for this item,
        //            using one-letter codes such as 'C' or 'm' (see above)
        // - classes: classes of results that got mixed together for this item,
        //            like 'EntityGeneric' or 'EntityWeather' (see above)
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
        // The selected result. If the user did not select a result (i.e.,
        // abandoned the search), the following values are not set.
        selection: {
          required: [],
          properties: {
            // How did the user select the result?
            // - click: using the mouse or the finger (on mobile)
            // - enter: using the keyboard
            action: { type: 'string', enum: SELECTION_ACTIONS },
            // What part of the result did the user click on? See above for
            // possible values, such as title or logo.
            element: { type: 'string', enum: SELECTION_ELEMENTS },
            // Which result did the user select? The first result has index 0.
            index: { type: 'integer', minimum: 0 },
            // True, if the user pressed enter for an autocompleted result.
            isAutocomplete: { type: 'boolean' },
            // Same schema as above for results: includes sources and classes.
            ...mkResultSchema(),
            // Where did the selected result come from?
            // - cliqz: from the Cliqz backend or history
            // - direct: the user entered a complete URL
            // - other: the user chose the complimentary search engine
            origin: { type: 'string', enum: SELECTION_ORIGINS },
            // The query length at the time of selection.
            queryLength: { type: 'integer', minimum: 0 },
            // TODO: could be moved to `results`
            // How long was the last result shown for (in ms) before the user
            // selected a result or abandoned the search?
            showTime: { type: 'integer', minimum: 0 },
            // The sub result type. See above for possible values.
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
