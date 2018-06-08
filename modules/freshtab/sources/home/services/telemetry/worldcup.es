import telemetry from './base';

export function messageShowSignal(messageId = '') {
  telemetry({
    type: 'worldcup.notification',
    action: 'show',
    target: messageId,
  });
}

export function messageClickSignal(messageId = '') {
  telemetry({
    type: 'worldcup.notification',
    action: 'click',
    target: messageId
  });
}

export function messageCloseSignal(messageId = '') {
  telemetry({
    type: 'worldcup.notification',
    action: 'click',
    target: messageId
  });
}

export function messageSkipSignal(messageId = '') {
  telemetry({
    type: 'worldcup.notification',
    action: 'click',
    target: messageId,
  });
}
