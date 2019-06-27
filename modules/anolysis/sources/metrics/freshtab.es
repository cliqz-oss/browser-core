import inject from '../../core/kord/inject';
import { actionFallback } from '../analyses-utils';

// From: https://stackoverflow.com/a/43053803
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

function mkFreshtabSchema(members, hasIndex, extra = {}) {
  const properties = {};
  for (let i = 0; i < members.length; i += 1) {
    const { key, value } = members[i];
    properties[key] = {
      type: 'string',
      enum: [value],
    };
  }

  if (hasIndex) {
    properties.index = { type: 'integer', minimum: 0, maximum: 100 };
  }

  return {
    name: `freshtab.${members.map(({ value }) => value).filter(v => v).join('.')}`,
    schema: {
      required: [
        ...Object.keys(properties),
        ...Object.keys(extra),
      ],
      properties: {
        ...properties,
        ...extra,
      },
    },
  };
}

export const NEWS_EDITIONS = [
  'de',
  'de-tr-en',
  'es',
  'fr',
  'gb',
  'intl',
  'it',
  'us',
];

export default () => [
  /**
   * metrics.freshtab.state informs us about how many of our users have freshtab enabled.
   */
  {
    name: 'metrics.freshtab.state',
    offsets: [0],
    version: 1,
    needsGid: true,
    sendToBackend: true,
    generate: async () => {
      try {
        const { active } = await inject.module('freshtab').action('getState');
        return [{
          is_freshtab_on: !!active,
        }];
      } catch (ex) {
        // We should always send a result for this signal, even if freshtab's
        // state cannot be retrieved (background is disabled, state is broken,
        // etc.)
        return [{
          is_freshtab_on: false,
        }];
      }
    },
    schema: {
      required: ['is_freshtab_on'],
      properties: {
        is_freshtab_on: { type: 'boolean' },
      },
    },
  },
  {
    name: 'freshtab.prefs.blueTheme',
    offsets: [0],
    generate: () => inject.module('freshtab').action('isBlueThemeEnabled').then(
      enabled => [{ enabled }],
      actionFallback([]),
    ),
    schema: {
      required: ['enabled'],
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  },
  {
    name: 'freshtab.prefs.browserTheme',
    schema: {
      required: ['theme'],
      properties: {
        theme: {
          type: 'string', enum: ['dark', 'light']
        },
      },
    },
  },
  {
    name: 'freshtab.prefs.config',
    offsets: [0],
    generate: () => inject.module('freshtab').action('getComponentsState').then(
      state => [state],
      actionFallback([]),
    ),
    schema: {
      required: [
        'components',
        'historyDials',
        'customDials',
        'search',
        'news',
        'background',
      ],
      properties: {
        components: { type: 'object' },
        historyDials: {
          required: ['visible'],
          properties: {
            visible: { type: 'boolean' },
          },
        },
        customDials: {
          required: ['visible'],
          properties: {
            visible: { type: 'boolean' },
          },
        },
        search: {
          required: ['visible'],
          properties: {
            visible: { type: 'boolean' },
          },
        },
        news: {
          required: ['visible', 'preferedCountry'],
          properties: {
            visible: { type: 'boolean' },
            preferedCountry: { type: 'string' },
          },
        },
        background: {
          required: ['image', 'index'],
          properties: {
            image: { type: 'string' },
            index: { type: 'number' }
          },
        },
      }
    },
  },

  // The following schemas are generated using a helper function, since they
  // all have a similar structure. A call of the function `mkFreshtabSchema`
  // such as:
  //
  //  mkFreshtabSchema([
  //    { key: 'type', value: 'home' },
  //    { key: 'action', value: 'show' },
  //  ], true),
  //
  //  Will result in the JSON schema:
  //
  //  {
  //    properties: {
  //      type: { type: 'string', enum: ['home'] },
  //      action: { type: 'string', enum: ['action'] },
  //      index: { type: 'integer', minimum: 0 },
  //    },
  //  }
  //
  //  The second argument of `mkFreshtabSchema` is a boolean which indicates if
  //  a property `index` should be added as well. Some metrics have an index
  //  (e.g.: 'freshtab.home.click.topnews') and some do not (e.g.:
  //  'freshtab.home.show').
  //
  //  Last but not least, the name of the schema is automatically derived in the
  //  following way from the keys: 'type', 'action', 'target'. For example, the
  //  name for the following metric:
  //
  //  {
  //    type: 'home',
  //    action: 'click',
  //    target: 'topnews',
  //    index: 0,
  //  }
  //
  //  Would be: 'freshtab.home.click.topnews'
  //             ^        ^    ^     ^ target
  //             |        |    | action
  //             |        | type
  //             | prefix for all freshtab metrics
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'show' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'blur' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'focus' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'hide' },
  ], false),

  // Settings button
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'settings' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'settings' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'cliqz_theme' },
  ], false, {
    state: { enum: ['on', 'off'] },
  }),

  // History button
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'history' },
  ], false),

  // Top Sites
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'topsite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'delete_topsite' },
  ], true),

  // Favorites
  // =========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'favorite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'add_favorite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'add_favorite' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'close' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'add_favorite' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'add' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'edit_favorite' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'edit_favorite' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'save' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'edit_favorite' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'close' },
  ], true),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'view', value: 'edit_favorite' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'delete' },
  ], true),

  // Search bar
  // ==========
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'focus' },
    { key: 'target', value: 'search_bar' },
  ], false),
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'blur' },
    { key: 'target', value: 'search_bar' },
  ], false),

  // News
  // ====
  mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'news_pagination' },
  ], true),

  // Offers
  // ======
  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'show' },
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'use' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'copy_code' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'remove_offer' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'click' },
    { key: 'target', value: 'remove' }
  ], false),

  mkFreshtabSchema([
    { key: 'type', value: 'offrz' },
    { key: 'action', value: 'hover' },
    { key: 'target', value: 'conditions' }
  ], false),

  // Generate all possible combinations of schemas for interactions with news:
  ...cartesian(
    ['click', 'hover'], // action
    ['topnews', 'breakingnews', 'yournews'], // target
  ).map(([action, target]) => mkFreshtabSchema([
    { key: 'type', value: 'home' },
    { key: 'action', value: action },
    { key: 'target', value: target },
  ], true, {
    edition: {
      type: 'string',
      enum: NEWS_EDITIONS,
    },
  })),
];
