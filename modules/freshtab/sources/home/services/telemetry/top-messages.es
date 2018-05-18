import telemetry from './base';

export function messageShowSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'banner',
    action: 'show',
    topic: messageId,
  });
}

export function messageClickSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'banner',
    action: 'click',
    target: 'ok',
    topic: messageId
  });
}

export function messageCloseSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'banner',
    action: 'click',
    target: 'close',
    topic: messageId
  });
}

export function messageSkipSignal(messageId = '') {
  telemetry({
    type: 'home',
    view: 'banner',
    action: 'click',
    target: 'later',
    topic: messageId
  });
}
