import { loadSchemas, generateFromType, aggregate } from './schemas-utils';

/**
 * Custom signal generators. A signal generator is a function taking as argument
 * a daily aggregation of all other signals, and returning a list of signals to
 * be sent through Anolysis. They can be used as value of the `generate`
 * attribute of a schema.
 */
import cliqztabSettings from './analyses/cliqztab-settings';
import cliqztabState from './analyses/cliqztab-state';

/**
 * This file contains definition for all telemetry signals sent through Anolysis
 * from Cliqz browsers to our backend. All signals need to specify some
 * information, and can be customized in some aspects.
 *
 * Having the schemas centralized allows for a few things:
 * - It is easier to know, at any point of time, what data is sent from Cliqz.
 * - Schemas allow to automatically check that sent signals are valid.
 * - Each schema *must* be decorated with documentation to explain the intent.
 *
 * The minimum amount of information needed to define a new schema is:
 * - `schema`, which specifies the shape of the signal to be sent.
 *
 * Optional attributes:
 * - `needsGid` [default: false], specifies if the GID should be sent as well.
 * - `instantPush` [default: false], if `true` the signal will be sent as is to
 *   our backend. Otherwise, it is first stored for one day, then aggregated
 *   with all other signals of the same type; the aggregation is then used to
 *   generate one or more new signals containing only statistics.
 * - `generate` [default: generateFromType], function used to generate signals
 *   from a daily aggregation. By default, all statistics are sent as is, but
 *   you can customize the kind of signals you want to generate from the
 *   aggregation by providing a custom function.
 *
 * Please note that default values are very conservative (on purpose) and
 * designed to default to maximum privacy.
 *
 * In addition, we provide a decorator to make the addition of aggregated
 * signals as easy as possible: `aggregate`. The function takes as argument a
 * name as well as a valid schema, and generate a new schema corresponding to
 * the aggregation of the original schema.
 *
 * You can read: `aggregate(name, my_schema)` as:
 * - Aggregate all signals of type `name` for one day.
 * - At the end of the day, aggregate them.
 * - Send one aggregated signal to our backend.
 *
 * Last but not least, when you add a new schema which generates signals based
 * on some aggregated data *or* has a custom `generate` function, please add it
 * to the list of tested schema in the file:
 *  `anolysis/tests/unit/telemetry-schemas-test.es`.
 */

const SCHEMAS = {
  // This telemetry signal is created by the abtests analysis.
  // It sends each AB test of the user atomically in a signal.
  abtests: {
    needsGid: true,
    instantPush: true,
    schema: {
      properties: {
        abtest: {
          type: 'string',
        },
      },
    },
  },

  // Sends no data, but pings once a day the backend along with the GID.
  ping: {
    needsGid: true,
    instantPush: true,
    schema: {},
  },

  // Retention signals: daily, weekly and monthly
  retention_daily: {
    needsGid: true,
    instantPush: true,
    schema: {
      properties: {
        units_active: {
          type: 'number', // 0 for inactive, 1 for active
        },
        offset: {
          type: 'number',
        },
      },
    },
  },

  retention_weekly: {
    needsGid: true,
    instantPush: true,
    schema: {
      properties: {
        units_active: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  retention_monthly: {
    needsGid: true,
    instantPush: true,
    schema: {
      properties: {
        units_active: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  // Abstraction of result_enter and result_click signals
  result_selection: aggregate('result_selection', {
    needsGid: true,
    instantPush: true,
    generate: generateFromType([
      'result_selection_autocomplete',
      'result_selection_click',
      'result_selection_enter',
      'result_selection_query',
      'result_selection_url',
    ]),
    schema: {
      properties: {
        type: {
          type: 'string',
          enum: [
            'result_selection_autocomplete',
            'result_selection_click',
            'result_selection_enter',
            'result_selection_query',
            'result_selection_url',
          ],
        },
        current_position: { type: 'string', minimum: 0 },
        query_length: { type: 'number', minimum: 0 },
        reaction_time: { type: 'number', minimum: 0 },
        display_time: { type: 'number', minimum: 0 },
        urlbar_time: { type: 'number', minimum: 0 },
      },
    },
  }),

  cliqztab_state: {
    needsGid: true,
    instantPush: true,
    generate: cliqztabState,
    schema: {
      properties: {
        is_cliqztab_on: { type: 'boolean' },
      },
    }
  },

  cliqztab_settings: {
    needsGid: false,
    instantPush: true,
    generate: cliqztabSettings,
    schema: {
      properties: {
        is_theme_on: { type: 'boolean' },
        is_background_on: { type: 'boolean' },
        is_most_visited_on: { type: 'boolean' },
        is_favorites_on: { type: 'boolean' },
        is_search_on: { type: 'boolean' },
        is_news_on: { type: 'boolean' },
      },
    }
  },

  // mobile telemetry
  // TODO: align with desktop
  // TODO: move to platform
  // TODO: at the moment only `number` and `string` types are allowed in
  // aggregated signals. We need to think about if it's safe to allow others as
  // well.
  // mobile_result_selection: aggregate('mobile_result_selection', {
  //   needsGid: true,
  //   schema: {
  //     properties: {
  //       current_position: { type: 'number' }, // result card index (zero based)
  //       position_type: {
  //         type: 'array',
  //         items: { type: 'string' },
  //       }, // result type
  //       tap_position: {
  //         type: 'array',
  //         items: { type: 'number' },
  //       }, // [number] x, y position of the tap
  //     },
  //   },
  // }),

  // mobile_swipe: aggregate('mobile_swipe', {
  //   needsGid: true,
  //   schema: {
  //     properties: {
  //       swipe_direction: {
  //         type: 'string',
  //         enum: ['left', 'right'],
  //       },
  //       index: { type: 'number' }, // card index (zero based)
  //       show_duration: { type: 'number' }, // duration since last card was shown
  //       card_count: { type: 'number' }, // visible cards count (including search engine card)
  //       position_type: {
  //         type: 'array',
  //         items: { type: 'string' },
  //       }, // result type
  //     },
  //   },
  // }),

  mobile_results_rendered: aggregate('mobile_results_rendered', {
    needsGid: true,
    schema: {
      properties: {
        result_count: { type: 'number' }, // number of results
      },
    },
  }),
};

export default loadSchemas(SCHEMAS);
