/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai, describeModule */

export default describeModule('core/language',
  function () {
    return {
      'core/console': {
        isLoggingEnabled() { return false; },
        default: console,
      },
      'core/services/pacemaker': {
        default: {
          everyFewMinutes() {},
          clearTimeout() {},
        },
      },
      'core/i18n': {
        default: {
          PLATFORM_LANGUAGE_FILTERED: 'strange_language'
        }
      },
      'core/prefs': {},
      'core/url': {}
    };
  },
  function () {
    describe('Language funnctions', function () {
      let CliqzLanguage;
      beforeEach(function () {
        CliqzLanguage = this.module().default;
      });
      context('getlocale', function () {
        it('checks getLocale', function () {
          chai.expect(CliqzLanguage.getLocale()).to.equal('strange_language');
        });
      });
    });
  });
