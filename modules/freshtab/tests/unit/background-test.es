/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule */

const moment = require('moment');

export default describeModule('freshtab/background',
  function () {
    return {
      'platform/globals': {
        chrome: {},
        browser: {},
      },
      'platform/lib/moment': {
        default: moment,
      },
      'core/services/telemetry': {
        default: {
          push: () => {},
          register: () => {},
        },
      },
      'core/http': {
        default: {
        },
      },
      'core/console': {
        isLoggingEnabled: () => false,
        default: {
          log() {},
        },
      },
      'core/events': {
        default: {
          sub() {},
          un_sub() {}
        },
      },
      'freshtab/main': {
        default: {
          startup() {},
          shutdown() {},
          rollback() {},
        }
      },
      'freshtab/news': {
        default: { unload() {} },
      },
      'freshtab/wallpapers': {
        default: { getWallpapers() { } }
      },
      'platform/freshtab/history': {
        default: { getTopUrls() { } }
      },
      'platform/freshtab/browser-import-dialog': {
        default: { openImportDialog() { } }
      },
      'platform/ext-messaging': {
        default: { sendMessage() {} }
      },
      'core/search-engines': {
        isSearchServiceReady() { return Promise.resolve(); },
        getSearchEngines: '[dynamic]'
      },
      'core/services/logos': {
        default: {
          getLogoDetails() { return ''; },
        },
      },
      'core/url': {
        tryDecodeURIComponent: '[dynamic]',
        tryDecodeURI: '[dynamic]',
        equals() { return true; },
        getCleanHost: s => s,
      },
      'core/onboarding': {

      },
      'core/base/background': {
        default: b => b
      },
      'core/browser': {
        forEachWindow: function () {}
      },
      'core/platform': {
        isCliqzBrowser: true,
        isDesktopBrowser: true,
        getResourceUrl: function () {}
      },
      'core/prefs': {
        default: {
          get(pref, def) { return def; },
          set() {},
          has() {},
          getObject() { return {}; },
          setObject() {},
        }
      },
      'core/i18n': {
        getLanguageFromLocale: function () {}
      },
      'platform/history-service': {
        default: {
          onVisitRemoved: {
            addListener() {},
            removeListener() {}
          },
        }
      },
    };
  },
  function () {
    let subject;

    beforeEach(function () {
      subject = this.module().default;
      subject.init({});
    });

    context('events', function () {
      describe('geolocation:wake-notification', function () {
        it('fetches news', function (done) {
          subject.actions.getNews = () => Promise.resolve().then(() => done());
          subject.events[
            'geolocation:wake-notification'
          ] = subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        });

        it('having news calls action refreshFrontend', function (done) {
          // const subject = this.module().default;

          subject.actions.getNews = () => Promise.resolve();
          subject.actions.refreshFrontend = () => done();

          subject.events[
            'geolocation:wake-notification'
          ] = subject.events['geolocation:wake-notification'].bind(subject);

          subject.events['geolocation:wake-notification']();
        });
      });
    });
  });
