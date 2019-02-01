/* eslint-disable camelcase */
/**
 * freshtab-settings is used to know how users use freshtab. In particular, we
 * want to learn if people keep the defaults settings, or customize it, and how
 * they do it.
 */
export default {
  name: 'freshtab-settings',
  needsGid: true,
  version: 1,
  generate: ({ records }) => {
    const freshtabConfigSignals = records.get('freshtab.prefs.config');
    const freshtabBlueThemeSignals = records.get('freshtab.prefs.blueTheme');

    if (freshtabConfigSignals.length === 0 || freshtabBlueThemeSignals.length === 0) {
      return [];
    }

    // keys ('background', 'historyDials', ...) don't exist by default
    const {
      background: { image: backgroundImage } = {},
      historyDials: { visible: is_most_visited_on } = {},
      customDials: { visible: is_favorites_on } = {},
      search: { visible: is_search_on } = {},
      news: { visible: is_news_on } = {},
      stats: { visible: is_stats_on } = {},
    } = freshtabConfigSignals[freshtabConfigSignals.length - 1];

    return [{
      // 'freshtab.blueTheme.enabled is set to `true` by default on Cliqz browser
      is_theme_on: freshtabBlueThemeSignals[freshtabBlueThemeSignals.length - 1].enabled,
      // background image is on by default, but 'image' is not set in prefs;
      // if the user switches the image off, 'image' is set to 'bg-default'
      is_background_on: !backgroundImage || backgroundImage !== 'bg-default',
      is_most_visited_on: Boolean(is_most_visited_on),
      is_favorites_on: Boolean(is_favorites_on),
      is_search_on: Boolean(is_search_on),
      is_news_on: Boolean(is_news_on),
      is_stats_on: Boolean(is_stats_on),
    }];
  },
  schema: {
    required: [
      'is_theme_on',
      'is_background_on',
      'is_most_visited_on',
      'is_favorites_on',
      'is_search_on',
      'is_news_on',
      'is_stats_on',
    ],
    properties: {
      is_theme_on: { type: 'boolean' },
      is_background_on: { type: 'boolean' },
      is_most_visited_on: { type: 'boolean' },
      is_favorites_on: { type: 'boolean' },
      is_search_on: { type: 'boolean' },
      is_news_on: { type: 'boolean' },
      is_stats_on: { type: 'boolean' },
    },
  }
};
