/* global registerInterval, TestIntervals, waitFor, window */

/* eslint func-names: "off" */
/* eslint no-unused-vars: 'off' */
/* eslint no-undef: 'off' */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-console: 'off' */
/* eslint no-param-reassign: 'off' */

function injectTestHelpers(CliqzUtils) {
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
    CliqzUtils.getWindow().CLIQZ.TestHelpers.http.httpGet(testUrl, callback, function () {
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

  window.sleep = function (ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
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
