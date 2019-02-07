import telemetry from './base';

export function statsClickSignal(card) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'click',
    target: card,
  });
}

export function statsHoverSignal(card) {
  telemetry({
    type: 'home',
    view: 'stats',
    action: 'hover',
    target: card,
  });
}
