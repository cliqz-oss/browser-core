import telemetry from './base';

export function messageShowSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'show',
    topic: messageId
  });
}

export function messageClickSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'click',
    target: 'ok',
    topic: messageId
  });
}

export function messageCloseSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'click',
    target: 'close',
    topic: messageId
  });
}
