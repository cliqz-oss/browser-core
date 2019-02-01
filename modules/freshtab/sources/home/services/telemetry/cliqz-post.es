import telemetry from './base';

export function messageClickSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'post',
    action: 'click',
    target: 'ok',
    topic: messageId
  });
}

export function messagShowSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'post',
    action: 'show',
    topic: messageId
  });
}
