import telemetry from './base';

export function clickSignal({ target = '' } = {}) {
  telemetry({
    type: 'blackfriday',
    action: 'click',
    target,
  });
}

export function notificationShowSignal() {
  telemetry({
    type: 'blackfriday',
    action: 'show',
    view: 'notification',
  });
}
