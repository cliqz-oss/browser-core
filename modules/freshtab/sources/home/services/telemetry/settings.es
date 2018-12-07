import telemetry from './base';
import config from '../../../config';

const settingsBaseSignal = {
  type: 'home',
  view: 'settings',
};

export function settingsCloseSignal() {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'close',
  });
}

export function settingsRestoreTopSitesSignal() {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'restore_topsites',
  });
}

export function settingsBackgroundSelectSignal(bg, product) {
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'background_image',
    state: config.backgrounds[product][bg].alias,
  });
}

export function settingsComponentsToggleSignal(component, oldState) {
  const target = config.components[component];
  const state = oldState ? 'off' : 'on';

  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target,
    state,
  });
}

export function newsSelectionChangeSignal(country) {
  const state = country || 'automatic';
  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'news_language',
    state,
  });
}
