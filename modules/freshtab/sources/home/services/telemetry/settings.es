import telemetry from './base';

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

export function settingsBackgroundSelectSignal(bg) {
  const BACKGROUNDS = {
    'bg-light': 'light',
    'bg-dark': 'dark',
    'bg-default': 'none',
  };

  const state = BACKGROUNDS[bg];

  telemetry({
    ...settingsBaseSignal,
    action: 'click',
    target: 'background',
    state,
  });
}

export function settingsComponentsToggleSignal(component, oldState) {
  const COMPONENTS = {
    historyDials: 'topsites',
    customDials: 'favorites',
    search: 'search_bar',
    news: 'news',
  };

  const target = COMPONENTS[component];
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
