import events from './events';
import prefs from './prefs';
import * as i18n from './i18n';

export default class Win {
  constructor(settings) {
    this.window = settings.window;
    this.actions = {
      addClassToWindow: this.addClassToWindow.bind(this),
      removeClassFromWindow: this.removeClassFromWindow.bind(this)
    };
  }

  init() {
    // expose globals
    this.window.CliqzEvents = events;
    this.window.CLIQZ.prefs = prefs;
    this.window.CLIQZ.i18n = i18n;
  }

  unload() {
    delete this.window.CliqzEvents;
    delete this.window.CLIQZ.prefs;
    delete this.window.CLIQZ.i18n;
  }

  addClassToWindow(...args) {
    const mainWindow = this.window.document.getElementById('main-window');
    args.forEach((aClass) => {
      mainWindow.classList.add(aClass);
    });
  }

  removeClassFromWindow(...args) {
    const mainWindow = this.window.document.getElementById('main-window');
    args.forEach((aClass) => {
      mainWindow.classList.remove(aClass);
    });
  }
}
