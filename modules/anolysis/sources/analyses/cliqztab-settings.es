/* eslint-disable camelcase */
import prefs from '../../core/prefs';

export default function () {
  // keys ('background', 'historyDials', ...) don't exist by default
  const {
    background: { image: backgroundImage } = {},
    historyDials: { visible: is_most_visited_on } = {},
    customDials: { visible: is_favorites_on } = {},
    search: { visible: is_search_on } = {},
    news: { visible: is_news_on } = {},
  } = JSON.parse(prefs.get('freshtabConfig', '{}'));

  return [{
    // 'freshtab.blueTheme.enabled is set to `true` by default on Cliqz browser
    is_theme_on: prefs.get('freshtab.blueTheme.enabled', false),
    // background image is on by default, but 'image' is not set in prefs;
    // if the user switches the image off, 'image' is set to 'bg-default'
    is_background_on: !backgroundImage || backgroundImage !== 'bg-default',
    is_most_visited_on: Boolean(is_most_visited_on),
    is_favorites_on: Boolean(is_favorites_on),
    is_search_on: Boolean(is_search_on),
    is_news_on: Boolean(is_news_on),
  }];
}
