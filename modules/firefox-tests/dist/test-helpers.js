/* eslint func-names: "off" */
/* eslint no-unused-vars: "off" */
/* eslint prefer-arrow-callback: "off" */
/* global window */

function injectTestHelpers(CliqzUtils, loadModule) {
  const win = CliqzUtils.getWindow();
  const urlBar = win.CLIQZ.Core.urlbar;
  const lang = CliqzUtils.getLocalizedString('locale_lang_code');
  const TIP = Components.classes['@mozilla.org/text-input-processor;1']
    .createInstance(Components.interfaces.nsITextInputProcessor);
  let popup = win.CLIQZ.Core.popup;

  window.setUserInput = function setUserInput(text) {
    urlBar.valueIsTyped = true;
    popup.mPopupOpen = false;
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  };

  window.getModule = loadModule;

  window.fillIn = function fillIn(text) {
    setUserInput(text);
  };

  window.fastFillIn = function fastFillIn(text) {
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  };

  window.waitFor = function waitFor(fn, until) {
    let resolver;
    let rejecter;
    let interval;
    const promise = new Promise(function (res, rej) {
      resolver = res;
      rejecter = rej;
    });

    function check() {
      if (fn()) {
        clearInterval(interval);
        resolver();
      }
    }
    interval = setInterval(check, 100);
    check();
    registerInterval(interval);

    if (until) {
      setTimeout(rejecter, until);
    }

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

  window.waitUntilServerUp = function waitUntilServerUp(testUrl, count, callback) {
    if (count <= 0) {
      callback('Failed to start server');
      return;
    }
    CliqzUtils.httpGet(testUrl, callback, function () {
      setTimeout(function () {
        waitUntilServerUp(testUrl, count - 1, callback);
      }, 100);
    });
  };

  window.registerInterval = function registerInterval(interval) {
    if (!window.TestIntervals) { window.TestIntervals = []; }
    TestIntervals.push(interval);
  };

  window.clearIntervals = function clearIntervals() {
    window.TestIntervals && window.TestIntervals.forEach(window.clearInterval);
  };

  window.click = function click(el, opt) {
    const _opt = opt || {};
    const ev = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: false,
      ctrlKey: _opt.ctrlKey || true,
      metaKey: _opt.metaKey || true
    });
    el.dispatchEvent(ev);
  };

  window.press = function press(opt) {
    let modKey;
    let modCode;
    let modifierEvent;

    const event = new KeyboardEvent('', {
      key: opt.key,
      code: opt.code || opt.key
    });

    if (
      (
        opt.ctrlKey !== undefined ||
        opt.altKey !== undefined ||
        opt.metaKey !== undefined ||
        opt.shiftKey !== undefined
      )
    ) {
      if (opt.ctrlKey === true) {
        modKey = 'Control';
        modCode = 'ControlLeft';
      } else if (opt.metaKey === true) {
        modKey = 'Meta';
        modCode = 'MetaLeft';
      } else if (opt.shiftKey === true) {
        modKey = 'Shift';
        modCode = 'ShiftLeft';
      }

      modifierEvent = new KeyboardEvent('', {
        key: modKey,
        code: modCode
      });
    }

    TIP.beginInputTransaction(win, console.log);
    if (modifierEvent !== undefined) {
      TIP.keydown(modifierEvent);
    }

    TIP.keydown(event);
  };

  window.pressAndWaitFor = function pressAndWaitFor(opt, condition) {
    press(opt);
    return waitFor(function () {
      return condition();
    });
  };

  window.release = function release(opt) {
    const event = new KeyboardEvent('', {
      key: opt.key,
      code: opt.code || opt.key,
      ctrlKey: opt.ctrlKey || false,
      shiftKey: opt.shiftKey || false,
      altKey: opt.altKey || false,
      metaKey: opt.metaKey || false
    });
    TIP.beginInputTransaction(win, console.log);
    TIP.keyup(event);
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

  window.respondWithSuggestions = function respondWithSuggestions(options) {
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

  // patches getBackendResults
  window.respondWith = function respondWith(res) {
    function getQuery(url) {
      const a = document.createElement('a');
      a.setAttribute('href', url);

      const params = new URLSearchParams(a.search);
      const queries = params.getAll('q');
      return queries[queries.length - 1];
    }

    const response = {
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
      };
    };
  };

  // patches getSnippet which calls RichHeader directly
  window.respondWithSnippet = function respondWith(snippet) {
    CliqzUtils.fetchFactory = function () {
      return function fetch(url) {
        return Promise.resolve({
          json() {
            return Promise.resolve(snippet);
          },
        });
      };
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
    return $(win.document.getElementById('cliqz-dropdown'));
  };

  window.$cliqzMessageContainer = function $cliqzResults() {
    return $(win.document.getElementById('cliqz-message-container'));
  };

  window.waitForPopup = function () {
    return waitFor(function () {
      popup = win.document.getElementById('PopupAutoCompleteRichResultCliqz');
      return popup && popup.mPopupOpen === true;
    }).then(function () {
      return new Promise(function (resolve) {
        CliqzUtils.setTimeout(resolve, 200);
      });
    });
  };

  window.waitForPopupClosed = function () {
    return waitFor(function () {
      popup = win.document.getElementById('PopupAutoCompleteRichResultCliqz');
      return popup && popup.mPopupOpen === false;
    }).then(function () {
      return new Promise(function (resolve) {
        CliqzUtils.setTimeout(resolve, 200);
      });
    });
  };

  window.waitForResult = function () {
    return waitFor(function () {
      return $cliqzResults().find('.cqz-result-box').length > 0;
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

  window.getLocaliseString = function (targets) {
    return lang === 'de-DE' ? targets.de : targets.default;
  };

  window.closeAllTabs = function (gBrowser) {
    const nonChromeTabs = Array.prototype.filter
      .call(gBrowser.tabContainer.childNodes, function (tab) {
        const currentBrowser = gBrowser.getBrowserForTab(tab);
        return currentBrowser && currentBrowser.currentURI && !currentBrowser.currentURI.spec.startsWith('chrome://');
      });
    nonChromeTabs.forEach(function (tab) {
      gBrowser.removeTab(tab);
    });
    return nonChromeTabs.length;
  };
}
