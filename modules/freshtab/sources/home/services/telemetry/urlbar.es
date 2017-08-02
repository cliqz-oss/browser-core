import telemetry from './base';

const urlBarBaseSignal = {
  type: 'home',
  target: 'search_bar',
};

export function urlBarFocusSignal() {
  telemetry({
    ...urlBarBaseSignal,
    action: 'focus',
  });
}

export function urlBarBlurSignal() {
  telemetry({
    ...urlBarBaseSignal,
    action: 'blur',
  });
}
