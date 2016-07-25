export default class {
  constructor(settings) {
    this.window = settings.window;
    this.historyUrl = settings.settings['history-ui-url'] ||
      'chrome://cliqz/content/fresh-tab-frontend/index.html#/history-sidebar';

  }

  init() {
    const doc = this.window.document,
      bcset = doc.getElementById('mainBroadcasterSet'),
      keyset = doc.getElementById('mainKeyset'),
      menupopup = doc.getElementById('viewSidebarMenu'),
      bc = doc.createElement('broadcaster'),
      key = doc.createElement('key'),
      mi = doc.createElement('menuitem'),
      prefix = 'history',
      str = {
        'menu-label': 'CLIQZ History',
        'sidebar-url': this.historyUrl,
        'sidebar-title': 'CLIQZ History',
        'menu-accesskey': 'h',
        'shortcut-key': 'h',
        'shortcut-modifiers': 'control,os'
      };

    // Keyboard shortcut support
    key.setAttribute('id', prefix + 'key');
    key.setAttribute('command', prefix + 'broadcaster');
    key.setAttribute('key', str['shortcut-key']);
    key.setAttribute('modifiers', str['shortcut-modifiers']);

    keyset.appendChild(key);
    // Sometimes the keyboard shortcut doesn't work.
    // Reload the keyset to activate the key. (A workaround from Bug 832984)
    ///keyset.parentElement.appendChild(keyset);

    // Sidebar
    bc.setAttribute('id', prefix + 'broadcaster');
    bc.setAttribute('label', str['menu-label']);
    bc.setAttribute('autoCheck', 'false');
    bc.setAttribute('type', 'checkbox');
    bc.setAttribute('group', 'sidebar');
    bc.setAttribute('sidebarurl', str['sidebar-url']);
    bc.setAttribute('sidebartitle', str['sidebar-title']);
    bc.setAttribute('accesskey', str['menu-accesskey']);
    bc.setAttribute('oncommand', 'toggleSidebar("' + prefix + 'broadcaster")');

    bcset.appendChild(bc);

    // Menu panel entry
    mi.setAttribute('id', prefix + 'menuitem');
    mi.setAttribute('key', prefix + 'key');
    mi.setAttribute('observes', prefix + 'broadcaster');

    menupopup.appendChild(mi);
  }

  unload() {

  }
}
