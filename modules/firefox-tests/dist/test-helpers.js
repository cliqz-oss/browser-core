/* global $cliqzResults, EventUtils, press,
  registerInterval, TestIntervals, waitFor, window */

/* eslint func-names: "off" */
/* eslint no-unused-vars: 'off' */
/* eslint no-undef: 'off' */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-console: 'off' */
/* eslint no-param-reassign: 'off' */

function injectTestHelpers(CliqzUtils) {
  const win = CliqzUtils.getWindow();
  const urlBar = win.CLIQZ.Core.urlbar;
  const lang = CliqzUtils.getLocalizedString('locale_lang_code');
  const TIP = Components.classes['@mozilla.org/text-input-processor;1']
    .createInstance(Components.interfaces.nsITextInputProcessor);
  let popup = win.CLIQZ.Core.popup;

  window.fillIn = function fillIn(text) {
    urlBar.valueIsTyped = true;
    popup.mPopupOpen = false;
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.value = '';
    EventUtils.sendString(text);
  };

  window.fastFillIn = function fastFillIn(text) {
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.value = '';
    EventUtils.sendString(text);
  };

  window.waitFor = function waitFor(fn, until) {
    let resolver;
    let rejecter;
    let interval;
    let error;

    const promise = new Promise(function (res, rej) {
      resolver = res;
      rejecter = rej;
    });

    function check() {
      let result = false;

      try {
        result = fn();
      } catch (e) {
        error = e;
      }

      if (result) {
        clearInterval(interval);
        resolver(result);
      }
    }

    interval = setInterval(check, 100);
    check();
    registerInterval(interval);

    if (until) {
      setTimeout(() => rejecter(error), until);
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
    let modifierEvent;

    const event = new KeyboardEvent('', {
      key: opt.key,
      code: opt.code || opt.key
    });

    TIP.beginInputTransaction(win, console.log);

    if (opt.ctrlKey) {
      modifierEvent = new KeyboardEvent('', {
        key: 'Control',
        code: 'ControlLeft'
      });
      TIP.keydown(modifierEvent);
    }

    if (opt.shiftKey) {
      modifierEvent = new KeyboardEvent('', {
        key: 'Shift',
        code: 'ShiftLeft'
      });
      TIP.keydown(modifierEvent);
    }

    if (opt.altKey) {
      modifierEvent = new KeyboardEvent('', {
        key: 'Alt',
        code: 'AltLeft'
      });
      TIP.keydown(modifierEvent);
    }

    if (opt.metaKey) {
      modifierEvent = new KeyboardEvent('', {
        key: 'Meta',
        code: 'MetaLeft'
      });
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
      return Promise.resolve([options.query, options.results]);
    };
  };

  // patches getBackendResults
  window.respondWith = function respondWith(res, ms = 0) {
    function getQuery(url) {
      const a = document.createElement('a');
      a.setAttribute('href', url);

      const params = new URLSearchParams(a.search);
      const queries = params.getAll('q');
      return queries[queries.length - 1];
    }
    const response = {
      results: res.results || [],
      offers: res.offers || [],
      suggestions: res.suggestions,
    };

    CliqzUtils.fetchFactory = function () {
      return function fetch(url) {
        return new Promise(function (resolve) {
          setTimeout(resolve, ms, {
            json() {
              return Promise.resolve(
                Object.assign(response, {
                  q: getQuery(url),
                })
              );
            },
          });
        });
      };
    };
  };

  // patches getSnippet which calls RichHeader directly
  window.respondWithSnippet = function respondWithSnippet(res) {
    CliqzUtils.fetchFactory = function () {
      return function fetch() {
        return Promise.resolve({
          json() {
            return Promise.resolve(res);
          },
        });
      };
    };
  };

  window.withHistory = function withHistory(res, ms = 0) {
    CliqzUtils.historySearch = function (q, cb) {
      setTimeout(cb, ms, {
        query: q,
        results: res,
        ready: true // SUCCESS https://dxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl#17
      });
    };
  };

  window.patchGeolocation = function patchGeolocation(geo) {
    // window.getModule('geolocation/background')
    getWindow().CLIQZ.app.modules
      .geolocation.background.getRawGeolocationData = function () {
        return Promise.resolve(geo);
      };
  };

  window.$cliqzResults = {
    _getEl() {
      return $(win.document.getElementById('cliqz-popup').contentWindow.document.getElementById('cliqz-dropdown'));
    },
    querySelector(...args) {
      return this._getEl()[0].querySelector(...args);
    },
    querySelectorAll(...args) {
      return this._getEl()[0].querySelectorAll(...args);
    }
  };

  window.$cliqzMessageContainer = function $cliqzResults() {
    return $(win.document.getElementById('cliqz-message-container'));
  };

  window.waitForPopup = function (resultsCount) {
    return waitFor(function () {
      popup = win.document.getElementById('cliqz-popup');
      const dropdown = window.$cliqzResults;
      return popup && (popup.style.height !== '0px') && dropdown;
    }).then(function (dropdown) {
      if (!resultsCount) {
        return Promise.resolve(dropdown);
      }
      return waitFor(function () {
        return chai.expect($cliqzResults.querySelectorAll('.cliqz-result')).to.have.length(resultsCount);
      }, 700).then(() => dropdown);
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

  window.getLocalisedString = function () {
    if (lang === 'de-DE') {
      return CliqzUtils.locale.de;
    } else if (lang === 'en-US') {
      return CliqzUtils.locale.en;
    }
    return CliqzUtils.locale.default;
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
