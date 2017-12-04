/* global window */

function injectTestHelpers(CliqzUtils, loadModule) {
  var win = CliqzUtils.getWindow();
  var urlBar = win.CLIQZ.Core.urlbar;
  var popup = win.CLIQZ.Core.popup;
  var lang = CliqzUtils.getLocalizedString('locale_lang_code');

  window.setUserInput = function setUserInput(text) {
    popup.mPopupOpen = false;
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  };

  window.getModule = loadModule;

  window.fillIn = function fillIn(text) {
    setUserInput(text);
    urlBar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  };

  window.fillIn = function fillIn(text) {
    setUserInput(text);
    urlBar.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
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

  window.waitForAsync = function waitForAsync(fn) {
    return fn()
      .then((value) => {
        if (value) {
          return Promise.resolve();
        }
        return Promise.reject();
      })
      .catch(() => new Promise((resolve) => {
        setTimeout(
          () => {
            resolve(waitForAsync(fn));
          },
          250
        );
      }));
  };

  window.wait_until_server_up = function wait_until_server_up(testUrl, count, callback) {
    if (count <= 0) {
      callback("Failed to start server");
      return;
    }
    CliqzUtils.httpGet(testUrl, callback, function () {
      setTimeout(function () {
        wait_until_server_up(testUrl, count - 1, callback);
      }, 100);
    })
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

  window.respondWithSuggestions = function respondWithSuggestions (options) {
    options = options || {};
    CliqzUtils.getSuggestions = function () {
      return Promise.resolve({
        query: options.query,
        response: {
          results: options.results,
        }
      });
    };
  };

  window.respondWith = function respondWith(res) {
    function getQuery(url) {
      var a = document.createElement('a');
      a.setAttribute('href', url);

      var params = new URLSearchParams(a.search);
      var queries = params.getAll('q');
      return queries[queries.length - 1];
    }

    var response = {
      results: res.results,
      suggestions: res.suggestions,
    };

    CliqzUtils.fetchFactory = function () {
      return function fetch(url) {
        return Promise.resolve({
          json() {
            return Promise.resolve(
              Object.assign(response, {
                q: getQuery(url),
              })
            );
          },
        });
      }
    };
  };

  window.withHistory = function withHistory(res) {
    CliqzUtils.historySearch = function (q, cb) {
      cb({
        query: q,
        results: res,
        ready: true // SUCCESS https://dxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl#17
      });
    };
  };

  window.$cliqzResults = function $cliqzResults() {
    return $(win.document.getElementById("cliqz-dropdown"));
  };

  window.$cliqzMessageContainer = function $cliqzResults() {
    return $(win.document.getElementById("cliqz-message-container"));
  }

  window.waitForPopup = function () {
    return waitFor(function () {
      var popup = win.document.getElementById("PopupAutoCompleteRichResultCliqz");
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
          CliqzUtils.setTimeout(resolve, 250);
        });
      });
  };

  window.sleep = function (ms) {
    return new Promise((resolve) => {
      CliqzUtils.setTimeout(resolve, ms);
    });
  };

  window.getLocaliseString = function(targets) {
    return lang === "de-DE" ? targets.de : targets.default;
  };

  window.closeAllTabs = function(gBrowser) {
    var nonChromeTabs = Array.prototype.filter.call(gBrowser.tabContainer.childNodes, function(tab) {
      var currentBrowser = gBrowser.getBrowserForTab(tab);
      return currentBrowser && currentBrowser.currentURI && ! currentBrowser.currentURI.spec.startsWith('chrome://')
    });
    nonChromeTabs.forEach( function(tab) {
      gBrowser.removeTab(tab);
    });
    return nonChromeTabs.length
  }
}
