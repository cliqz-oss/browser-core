import telemetry from './base';

function getElement(ev) {
  const elem = ev.target;
  let element = elem.classList[0].replace(/news-/g, '');
  if (elem.classList.contains('read-more-button')) {
    element = 'read_more';
  }
  return element;
}

export function newsClickSignal(ev, type, index, edition) {
  const element = getElement(ev);
  let target = type;
  target = type.replace(/-/g, ''); // remove '-'' from breaking-news
  telemetry({
    type: 'home',
    action: 'click',
    target,
    index,
    element,
    edition,
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

export function newsHoverSignal(ev, target, index, hoverTime, edition) {
  const element = getElement(ev);
  telemetry({
    type: 'home',
    action: 'hover',
    target,
    index,
    hover_time: hoverTime,
    element,
    edition,
  });
}
