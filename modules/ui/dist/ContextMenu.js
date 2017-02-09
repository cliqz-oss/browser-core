'use strict';
/*
 * This module enables right click context menu
 *
 */

(function(ctx) {


  function createContextMenu(box, menuItems) {
    var doc = document,
        contextMenu = doc.createElement('menupopup');

    box.appendChild(contextMenu);
    contextMenu.setAttribute('id', "dropdownContextMenu");

    for(var item = 0; item < menuItems.length; item++) {
        var menuItem = doc.createElement('menuitem');
        menuItem.setAttribute('label', menuItems[item].label);
        menuItem.setAttribute('functionality', menuItems[item].functionality);
        menuItem.addEventListener("command", menuItems[item].command, false);
        if(menuItem.getAttribute('label') === CliqzUtils.getLocalizedString('cMenuFeedback')) {
          menuItem.setAttribute('class', 'menuitem-iconic');
          menuItem.style.listStyleImage = 'url(' + CliqzUtils.SKIN_PATH + 'cliqz.png)';
        }
        contextMenu.appendChild(menuItem);
    }
    return contextMenu
  }

  var contextMenu,
      activeArea,
      CONTEXT_MENU_ITEMS,
      target;

  function telemetry(type){
    var signal = {
      type: 'context_menu'
    };

    if(type) {
      signal.action = "click";
      signal.target = type;
    } else {
      signal.action = "open";
      signal.context = "dropdown";
    }

    CliqzUtils.telemetry(signal);
  }

  function openFeedback(e) {
    CliqzUtils.openLink(window, CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true);
    telemetry('open_feedback');
  }

  function openNewTab(e) {
    CliqzUtils.openLink(window, e.target.getAttribute('data-url'), true);
    telemetry('open_new_tab');
  }

  function openNewWindow(e) {
    CliqzUtils.openLink(window, e.target.getAttribute('data-url'), false, true);
    telemetry('open_new_window');
  }

  function openInPrivateWindow(e) {
    CliqzUtils.openLink(window, e.target.getAttribute('data-url'), false, false, true);
    telemetry('open_private_window');
  }

  function isTabOpen(url, cb) {
    var chrome = CliqzUtils.getWindow(),
        tabs = chrome.gBrowser.tabs,
        isOpen = false;

    Array.from(tabs).some(function(tab) {
      var browser = gBrowser.getBrowserForTab(tab);
      if(browser.currentURI && browser.currentURI.spec === url) {
        isOpen = true;
        return isOpen;
      }
    });
    if(isOpen) {
      cb && cb();
    }
    return isOpen;
  }

  function removeEntry(e) {
    var item,
        url = e.target.getAttribute('data-url'),
        uri = CliqzUtils.makeUri(url, '', null),
        chrome = CliqzUtils.getWindow();

    isTabOpen(url, function() {
      var tabs = chrome.gBrowser.tabs;
      Array.from(tabs).forEach(function(tab) {
        var browser = gBrowser.getBrowserForTab(tab);
        if(browser.currentURI && browser.currentURI.spec === url) {
          chrome.gBrowser.removeTab(tab);
        }
      });
    })

    if(CliqzHistoryManager.isBookmarked(uri)){
      removeFromBookmarks(uri);
      //TODO remove from history only if history is enabled
      removeFromHistory(url, uri);
      telemetry('remove_from_history_and_bookmarks');
    } else {
      removeFromHistory(url, uri);
      telemetry('remove_from_history');
    }

  }

  function triggerQuery() {
    var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar'),
        query = urlbar.value;

    setTimeout(function() {
      urlbar.mInputField.setUserInput('');
      urlbar.mInputField.setUserInput(query);
    }, 50);
  }

  function removeFromHistory(url, uri) {
    try {
      CliqzHistoryManager.removeFromHistory(uri);
      triggerQuery();

    } catch(e) {
      CliqzUtils.log(e.message, 'Error removing entry from history');
    }
  }

  function removeFromBookmarks(uri) {
    try {
      CliqzHistoryManager.removeFromBookmarks(uri);
      triggerQuery();
    } catch(e) {
      CliqzUtils.log(e.message, "Error removing entry from bookmarks");
    }
  }

  function replaceRemoveEntry(items, withItem) {
    Array.from(items).forEach(function(child, index) {
      if(child.getAttribute('functionality') === 'removeEntry') {
        child.setAttribute('label', CliqzUtils.getLocalizedString(withItem))
      }
    });
  }

  var ContextMenu = {
    enableContextMenu: function(box) {
      activeArea = box;
      activeArea.addEventListener('contextmenu', rightClick);
    }
  };

  function initContextMenu(){
    // we call private mode "Forget mode" in the CLIQZ browser (channel 40)
    const privateWinName = CLIQZ.settings.channel == '40' ?
      CliqzUtils.getLocalizedString('forget') :
      CliqzUtils.getLocalizedString('private');

    CONTEXT_MENU_ITEMS = [
        {
          label: CliqzUtils.getLocalizedString('cMenuOpenInNewTab'),
          command: openNewTab,
          displayInDebug: true,
          functionality: 'openNewTab'
        }, {
          label: CliqzUtils.getLocalizedString('cMenuOpenInNewWindow'),
          command: openNewWindow,
          displayInDebug: true,
          functionality: 'openNewWindow'
        }, {
          label: CliqzUtils.getLocalizedString('cMenuOpenInPrivateWindow', privateWinName),
          command: openInPrivateWindow,
          displayInDebug: false,
          functionality: 'openInPrivateWindow'
        }, {
          label: CliqzUtils.getLocalizedString('cMenuRemoveFromHistory'),
          command: removeEntry,
          displayInDebug: true,
          functionality: 'removeEntry'
        }, {
          label: CliqzUtils.getLocalizedString('cMenuFeedback'),
          command: openFeedback,
          displayInDebug: true,
          functionality: 'openFeedback'
        }
    ];

    return createContextMenu(activeArea, CONTEXT_MENU_ITEMS);
  }

  function hideRemoveEntry(menu) {
    Array.from(menu.children).forEach(function(child) {
      if(child.getAttribute('functionality') === 'removeEntry') {
        child.setAttribute('style', 'display:none');
      }
    });
  }

  function showRemoveEntry(menu) {
    Array.from(menu.children).forEach(function(child) {
      if(child.getAttribute('functionality') === 'removeEntry') {
        child.setAttribute('style', 'display:block');
      }
    });
  }

  function rightClick(ev) {
    contextMenu = contextMenu || initContextMenu(); //lazy initialization
    target = ev.target;

    var children,
        uri,
        url = CLIQZ.UI.getResultOrChildAttr(ev.target, 'url');

    if(url.trim() != '') {
      children = contextMenu.childNodes;
      var menu = contextMenu;
      uri = CliqzUtils.makeUri(url, '', null);
      if (uri === null) {

        hideRemoveEntry(menu);

        for(var i = 0; i < children.length; i++) {
          children[i].setAttribute('data-url', url);
        }
        CliqzUtils.openPopup(contextMenu, ev, ev.screenX, ev.screenY);

        telemetry();

      } else {
        PlacesUtils.asyncHistory.isURIVisited(uri, function(aURI, aIsVisited) {
          if(!aIsVisited || CLIQZ.UI.getElementByAttr(target, 'dont-remove', 'true')) {
            hideRemoveEntry(menu);

          } else {
            showRemoveEntry(menu);
            var label = CliqzUtils.getLocalizedString('cMenuRemoveFromBookmarksAndHistory');
            if(CliqzHistoryManager.isBookmarked(uri)){
              //TODO check if history is disabled, in this case we should display Remove from Bookmarks
              if(isTabOpen(url)) {
                label = CliqzUtils.getLocalizedString('cMenuRemoveFromHistoryAndBookmarksAndCloseTab');
              }
              replaceRemoveEntry(children, label);
            } else {
              var label = CliqzUtils.getLocalizedString('cMenuRemoveFromHistory');
              if(isTabOpen(url)) {
                label = CliqzUtils.getLocalizedString('cMenuRemoveFromHistoryAndCloseTab');
              }
              replaceRemoveEntry(children, label);
            }
          }

          for(var i = 0; i < children.length; i++) {
            children[i].setAttribute('data-url', url);
          }
          CliqzUtils.openPopup(contextMenu, ev, ev.screenX, ev.screenY);

          telemetry();
        });
      }
    }
  }

  ctx.CLIQZ.ContextMenu = ContextMenu;

})(this);
