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
  const newsTypes = state.news.data.reduce((hash, curr) => {
    let newsType = `${curr.type}_count`;
    newsType = newsType.replace(/-/g, ''); // remove '-'' from breaking-news
    const news = hash;
    news[newsType] = hash[newsType] || 0;
    news[newsType] += 1;
    return news;
  }, {});

  telemetry(Object.assign({
    type: 'home',
    action: 'show',
    favorite_count: state.dials.custom.length,
    topsite_count: state.dials.history.length,
    is_favorites_on: state.config.componentsState.customDials.visible,
    is_topsites_on: state.config.componentsState.historyDials.visible,
    is_search_bar_on: state.config.componentsState.search.visible,
    is_news_on: state.config.componentsState.news.visible,
  }, newsTypes));
}
