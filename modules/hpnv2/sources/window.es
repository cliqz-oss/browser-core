import prefs from '../core/prefs';

export default class {
  init() {
  }

  unload() {
  }

  status() {
    return {
      visible: true,
      state: prefs.get('hpn-query'),
    };
  }
}
