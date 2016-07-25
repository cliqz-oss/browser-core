'use strict';
/*
 * This module enables right click context menu
 *
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

(function(ctx) {

  var contextMenu,
      CONTEXT_MENU_ITEMS,
      action = "context_menu";

  function openFeedback(e) {
    CLIQZ.Core.openLink(CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true);
    
    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_feedback'
    };
    CliqzUtils.telemetry(signal);
  }

  function openNewTab(e) {
    CLIQZ.Core.openLink(e.target.getAttribute('data-url'), true);
    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_new_tab'
    };
    CliqzUtils.telemetry(signal);
  }

  function openNewWindow(e) {
    CLIQZ.Core.openLink(e.target.getAttribute('data-url'), false, true);
    
    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_new_window'
    };
    CliqzUtils.telemetry(signal);
  }
  
  function openInPrivateWindow(e) {
    CLIQZ.Core.openLink(e.target.getAttribute('data-url'), false, false, true);
    
    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_private_window'
    };
    CliqzUtils.telemetry(signal);
  }

  var ContextMenu = {
    enableContextMenu: function(box) {
      CONTEXT_MENU_ITEMS = [
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewTab'),         'command': openNewTab },
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewWindow'),      'command': openNewWindow },
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInPrivateWindow'),  'command': openInPrivateWindow },
        { 'label': CliqzUtils.getLocalizedString('cMenuFeedback'),             'command': openFeedback }
      ];
      contextMenu = document.createElement('menupopup');
      box.appendChild(contextMenu);

      for(var item = 0; item < CONTEXT_MENU_ITEMS.length; item++) {
          var menuItem = document.createElement('menuitem');
          menuItem.setAttribute('label', CONTEXT_MENU_ITEMS[item].label);
          menuItem.addEventListener("command", CONTEXT_MENU_ITEMS[item].command, false);
          if(menuItem.getAttribute('label') === CliqzUtils.getLocalizedString('cMenuFeedback')) {
            menuItem.setAttribute('class', 'menuitem-iconic');
            menuItem.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz.png)';
          }
          contextMenu.appendChild(menuItem);
      }

      box.addEventListener('contextmenu', rightClick);
    }
  };
  
  function rightClick(ev) {
    var children, 
        url = CLIQZ.UI.getResultOrChildAttr(ev.target, 'url');
    
    if(url.trim() != '') {
      children = contextMenu.childNodes;

      for(var i = 0; i < children.length; i++) {
        children[i].setAttribute('data-url', url);
        children[i].setAttribute('data-kind', CLIQZ.UI.getResultOrChildAttr(ev.target, 'kind'));
      }
      contextMenu.openPopupAtScreen(ev.screenX, ev.screenY, false);

      var signal = {
        type: 'activity',
        action: action
      };
      CliqzUtils.telemetry(signal);
    }
  }

  ctx.CLIQZ.ContextMenu = ContextMenu;

})(this);

