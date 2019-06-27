import telemetry from './base';

export function statsClickSignal(index) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'card',
    index,
  });
}

export function statsHoverSignal(index) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'hover',
    target: 'card',
    index,
  });
}

export function statsDownloadClickSignal() {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: 'download',
  });
}
