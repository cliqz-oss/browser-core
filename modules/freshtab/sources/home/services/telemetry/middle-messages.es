import telemetry from './base';

export function messageShowSignal() {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'show',
  });
}

export function messageClickSignal() {
  telemetry({
    type: 'home',
    view: 'message',
    action: 'click',
    target: 'try',
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
