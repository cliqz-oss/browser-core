import CliqzUnblock from 'unblock/main';

export default class {
  /**
  * @class Window
  * @namespace unblock
  * @constructor
  */
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  }

  unload() {
  }
  /**
  * @method createButtonItem
  * @param win {Object} Window
  */
  createButtonItem(win) {
    if (!CliqzUnblock.ui_enabled) return;
    var doc = win.document,
      menu = doc.createElement('menu'),
      menupopup = doc.createElement('menupopup');

    menu.setAttribute('label', CliqzUtils.getLocalizedString("unblock_menu_option"));

    var filter_levels = {
        'always': {
          name: CliqzUtils.getLocalizedString('always'),
          selected: false
        },
        'ask': {
          name: CliqzUtils.getLocalizedString('always_ask'),
          selected: false
        },
        'never': {
          name: CliqzUtils.getLocalizedString('never'),
          selected: false
        }
    };
    filter_levels[CliqzUnblock.getMode()].selected = true;

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');

      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(chrome://cliqz/content/static/skin/checkmark.png)';
      }

      item.filter_level = level;
      item.addEventListener('command', function(event) {
        CliqzUnblock.setMode(this.filter_level);
        CliqzUtils.setTimeout(win.CLIQZ.Core.refreshButtons, 0);
      }, false);

      menupopup.appendChild(item);
    };
    menu.appendChild(menupopup);
    return menu;
  }
};
