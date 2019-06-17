import telemetry from './base';

let start = 0;
let focusTotalTime = 0;
let displayTotalTime = 0;
let focusStart;
let blurStart = 0;
let focusTime = 0;
let blurCount = 0;
let unloadingStarted = false;
let focus = true;

export function historyClickSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'history',
  });
}

export function historyPaginationHoverSignal(index) {
  telemetry({
    type: 'home',
    action: 'hover',
    target: 'history_pagination',
    index,
  });
}

export function historyPaginationClickSignal(index) {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'history_pagination',
    index,
  });
}

export function settingsClickSignal() {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'settings',
  });
}

export function homeConfigsStatusSignal(state, tabIndex) {
  const newsTypes = state.news.data.reduce((hash, curr) => {
    let newsType = `${curr.type}_count`;
    newsType = newsType.replace(/-/g, ''); // remove '-'' from breaking-news
    const news = hash;
    news[newsType] = hash[newsType] || 0;
    news[newsType] += 1;
    return news;
  }, {});

  start = new Date().getTime();
  focusStart = start;

  telemetry({
    type: 'home',
    action: 'focus',
    home_id: tabIndex
  });

  telemetry(Object.assign({
    type: 'home',
    action: 'show',
    favorite_count: state.dials.custom.length,
    topsite_count: state.dials.history.length,
    is_favorites_on: state.config.componentsState.customDials.visible,
    is_topsites_on: state.config.componentsState.historyDials.visible,
    is_search_bar_on: state.config.componentsState.search.visible,
    is_news_on: state.config.componentsState.news.visible,
    is_stats_on: state.config.componentsState.stats.visible,
  }, newsTypes));
}

export function sendHomeUnloadSignal({ tabIndex }) {
  if (unloadingStarted) {
    return;
  }
  unloadingStarted = true;
  displayTotalTime = new Date().getTime() - start;
  focusTotalTime += new Date().getTime() - focusStart;
  telemetry({
    type: 'home',
    action: 'hide',
    display_time: displayTotalTime,
    focus_time: focusTotalTime,
    blur_count: blurCount,
    home_id: tabIndex
  });
}

export function sendHomeBlurSignal({ tabIndex }) {
  focus = false;
  blurStart = new Date().getTime();
  focusTotalTime += blurStart - focusStart;
  focusTime = blurStart - focusStart;
  blurCount += 1;
  telemetry({
    type: 'home',
    action: 'blur',
    focus_time: focusTime,
    home_id: tabIndex
  });
}

export function sendHomeFocusSignal({ tabIndex }) {
  if (focus) {
    return;
  }
  focusStart = new Date().getTime();
  telemetry({
    type: 'home',
    action: 'focus',
    home_id: tabIndex
  });
}

export function sendTooltipShowSignal() {
  telemetry({
    type: 'home',
    view: 'notification',
    topic: 'personalize',
    action: 'show',
  });
}

export function sendTooltipExploreSignal() {
  telemetry({
    type: 'home',
    view: 'notification',
    topic: 'personalize',
    action: 'click',
    target: 'try',
  });
}

export function sendTooltipLaterSignal() {
  telemetry({
    type: 'home',
    view: 'notification',
    topic: 'personalize',
    action: 'click',
    target: 'later',
  });
}

export function sendTooltipCloseSignal() {
  telemetry({
    type: 'home',
    view: 'notification',
    topic: 'personalize',
    action: 'click',
    target: 'close',
  });
}
