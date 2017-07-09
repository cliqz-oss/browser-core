import { waitWindowReady } from '../browser';

export default class Sidebar {

  constructor({ url, prefix, title, shortcut, actions }) {
    this.config = {
      'prefix': prefix,
      'menu-label': title,
      'sidebar-url': url,
      'sidebar-title': title,
      'menu-accesskey': shortcut,
      'shortcut-key': shortcut,
      'shortcut-modifiers': 'control,os'
    };
    this.actions = actions;
  }

  attach(window) {
    this.window = window;
    const doc = window.document;
    const bcset = doc.getElementById('mainBroadcasterSet');
    const keyset = doc.getElementById('mainKeyset');
    const menupopup = doc.getElementById('viewSidebarMenu');

    const bc = doc.createElement('broadcaster');
    const key = doc.createElement('key');
    const mi = doc.createElement('menuitem');

    // Keyboard shortcut support
    key.setAttribute('id', this.config.prefix + 'key');
    key.setAttribute('command', this.config.prefix + 'broadcaster');
    key.setAttribute('key', this.config['shortcut-key']);
    key.setAttribute('modifiers', this.config['shortcut-modifiers']);

    keyset.appendChild(key);
    // Sometimes the keyboard shortcut doesn't work.
    // Reload the keyset to activate the key. (A workaround from Bug 832984)
    ///keyset.parentElement.appendChild(keyset);

    // Sidebar
    bc.setAttribute('id', this.config.prefix + 'broadcaster');
    bc.setAttribute('label', this.config['menu-label']);
    bc.setAttribute('autoCheck', 'false');
    bc.setAttribute('type', 'checkbox');
    bc.setAttribute('group', 'sidebar');
    bc.setAttribute('sidebarurl', this.config['sidebar-url']);
    bc.setAttribute('sidebartitle', this.config['sidebar-title']);
    bc.setAttribute('accesskey', this.config['menu-accesskey']);
    bc.setAttribute('oncommand', 'toggleSidebar("' + this.config.prefix + 'broadcaster")');

    bcset.appendChild(bc);

    // Menu panel entry
    mi.setAttribute('id', this.config.prefix + 'menuitem');
    mi.setAttribute('key', this.config.prefix + 'key');
    mi.setAttribute('observes', this.config.prefix + 'broadcaster');

    menupopup.appendChild(mi);
  }

  deattach() {
    this.hide();
    delete this.window;
  }

  open() {
    return this.window.SidebarUI.show(this.config.prefix+'broadcaster').then(() => {

      const contentWindow = this.window.SidebarUI.browser.contentWindow;
      const onMessage = (ev) => {
        if (ev.data.target === 'cliqz') {
          this.actions[ev.data.action](...ev.data.args);
        }
      };
      const onUnload = () => {
        contentWindow.removeEventListener('message', onMessage);
      };
      contentWindow.addEventListener('message', onMessage);
      contentWindow.addEventListener('unload', onUnload);
    });
  }

  close() {
    return this.window.SidebarUI.hide();
  }

  postMessage(msg) {
    const contentWindow = this.window.SidebarUI.browser.contentWindow;
    if (contentWindow.location.href !== this.config['sidebar-url']) {
      return;
    }

    contentWindow.postMessage(msg, '*');
  }
}
