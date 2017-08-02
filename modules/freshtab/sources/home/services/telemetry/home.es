import telemetry from './base';

export function historyClickSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'history',
  });
}

export function settingsClickSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'settings',
  });
}

export function homeConfigsStatusSignal(state) {
  const [breakingNewsCount, topNewsCount] =
    state.news.data.reduce(([breakingCount, topCount], news) => ([
      breakingCount + Number(news.type === 'breaking-news'),
      topCount + Number(news.type !== 'breaking-news'),
    ]), [0, 0]);

  telemetry({
    type: 'home',
    action: 'show',
    favorite_count: state.dials.custom.length,
    topsite_count: state.dials.history.length,
    breakingnews_count: breakingNewsCount,
    topnews_count: topNewsCount,
    is_favorites_on: state.config.componentsState.customDials.visible,
    is_topsites_on: state.config.componentsState.historyDials.visible,
    is_search_bar_on: state.config.componentsState.search.visible,
    is_news_on: state.config.componentsState.news.visible,
  });
}
