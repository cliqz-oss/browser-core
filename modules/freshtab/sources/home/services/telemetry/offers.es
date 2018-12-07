import telemetry from './base';

export function offerShowSignal() {
  telemetry({
    type: 'offrz',
    view: 'tab',
    action: 'show',
  });
}

export function offerClickSignal(target) {
  if (!target) {
    return;
  }

  telemetry({
    type: 'offrz',
    view: 'tab',
    action: 'click',
    target,
  });
}

export function offerHoverSignal(target) {
  if (!target) {
    return;
  }

  telemetry({
    type: 'offrz',
    view: 'tab',
    action: 'hover',
    target,
  });
}
