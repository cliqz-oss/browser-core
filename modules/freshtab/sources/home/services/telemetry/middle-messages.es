import telemetry from './base';

export function messageShowSignal() {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'show',
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

export function messageCloseSignal() {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'click',
    target: 'close',
  });
}
