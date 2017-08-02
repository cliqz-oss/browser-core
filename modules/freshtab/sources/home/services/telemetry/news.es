import telemetry from './base';

export function newsClickSignal(isBreakingNews, index) {
  const target = isBreakingNews ? 'breakingnews' : 'topnews';

  telemetry({
    type: 'home',
    action: 'click',
    target,
    index,
  });
}

export function newsPaginationClickSignal(index) {
  telemetry({
    type: 'home',
    action: 'click',
    target: 'news_pagination',
    index,
  });
}
