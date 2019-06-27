export const PASSIVE_EVENTS = [
  'input',
  'paste',
  'focus',
  'blur',
  'mouseup',
  'drop',
];

export const PREVENTABLE_EVENTS = [
  'keydown',
  'keypress',
  'mouseup',
];

export const PASSIVE_LISTENER_OPTIONS = {
  passive: true,
  mozSystemGroup: true,
};

export const PREVENTABLE_LISTENER_OPTIONS = {
  passive: false,
};

export function stopEvent(event) {
  event.stopImmediatePropagation();
  event.stopPropagation();
  event.preventDefault();
}
