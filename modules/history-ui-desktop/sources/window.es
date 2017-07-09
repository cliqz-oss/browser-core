import Sidebar from '../core/ui/sidebar';

export default class {
  constructor({ window, settings }) {
    this.window = window;
    this.historyUrl = settings['history-ui-url'] ||
      'chrome://cliqz/content/fresh-tab-frontend/index.html#/history-sidebar';

    this.sidebar = new Sidebar({
      url: this.historyUrl,
      prefix: 'history',
      title: 'Cliqz History',
      shortcut: 'h',
    });
  }

  init() {
    this.sidebar.attach(this.window);
  }

  unload() {
    this.sidebar.deattach(this.window);
  }
}
