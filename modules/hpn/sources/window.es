import prefs from '../core/prefs';

export default class {
  constructor({ window, background }) {
    this.background = background;
    this.window = window;
  }

  init() {
    if (this.background.CliqzSecureMessage) {
      this.background.CliqzSecureMessage.initAtWindow(this.window);
      this.window.CliqzSecureMessage = this.background.CliqzSecureMessage;
      Object.assign(this.window.CliqzSecureMessage, this.background.actions);
    }
  }

  unload() {
    delete this.window.CliqzSecureMessage;
  }

  status() {
    if (this.background.CliqzSecureMessage) {
      return {
        visible: true,
        state: prefs.get('hpn-query'),
      };
    }
    return undefined;
  }
}
