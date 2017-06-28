function injectTestHelpers(CliqzUtils) {
  var chrome = CliqzUtils.getWindow();
  var urlBar = chrome.CLIQZ.Core.urlbar;
  var popup = chrome.CLIQZ.Core.popup;
  var lang = CliqzUtils.getLocalizedString('locale_lang_code');

  window.fillIn = function fillIn(text) {
    popup.mPopupOpen = false;
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  };

  window.waitFor = function waitFor(fn) {
  	var resolver, rejecter, promise = new Promise(function (res, rej) {
      resolver = res;
      rejecter = rej;
    });

    function check() {
      if (fn()) {
        clearInterval(interval);
        resolver()
      }
    }
    var interval = setInterval(check, 250);
    check();
    registerInterval(interval);

    return promise;
  };

  window.registerInterval = function registerInterval(interval) {
    if(!window.TestIntervals) { window.TestIntervals = []; }
    TestIntervals.push(interval);
  };

  window.clearIntervals = function clearIntervals() {
    window.TestIntervals && window.TestIntervals.forEach(window.clearInterval);
  };

  window.click = function click(el) {
    var ev = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: false,
      ctrlKey: true,
      metaKey: true
    });
    el.dispatchEvent(ev)
  };

  /*
  window.enter = function enter(el) {
    if(el) el.focus();
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/initKeyEvent
    var ev = document.createEvent('KeyboardEvent');
    // Send key '13' (= enter)
    ev.initKeyEvent(
        'keydown', true, true, window, true , false, false, true , 13, 0);
    el.dispatchEvent(ev);
  };
  */

  window.respondWith = function respondWith(res) {
    CliqzUtils.getBackendResults = function (q) {
      return Promise.resolve({
        response: res,
        query: q,
        status: 200
      });
    };
  };

  window.$cliqzResults = function $cliqzResults() {
    return $(chrome.document.getElementById("cliqz-dropdown"));
  };

  window.$cliqzMessageContainer = function $cliqzResults() {
    return $(chrome.document.getElementById("cliqz-message-container"));
  }

  window.waitForPopup = function () {
    return waitFor(function () {
      var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
      return popup && popup.mPopupOpen === true;
    }).then(function () {
      return new Promise(function (resolve) {
        CliqzUtils.setTimeout(resolve, 200);
      });
    });
  };

  window.waitForResult = function () {
      return waitFor(function () {
        return $cliqzResults().find(".cqz-result-box").length > 0;
      }).then(function () {
        return new Promise(function (resolve) {
          CliqzUtils.setTimeout(resolve, 200);
        });
      });
  };

  window.getLocaliseString = function(targets) {
    return lang === "de-DE" ? targets.de : targets.default;
  };

  window.closeAllTabs = function(gBrowser) {
    var nonChromeTabs = Array.prototype.filter.call(gBrowser.tabContainer.childNodes, function(tab) {
      var currentBrowser = gBrowser.getBrowserForTab(tab);
      console.log(currentBrowser);
      return currentBrowser && currentBrowser.currentURI && ! currentBrowser.currentURI.spec.startsWith('chrome://')
    });
    nonChromeTabs.forEach( function(tab) {
      gBrowser.removeTab(tab);
    });
    return nonChromeTabs.length
  }
}
