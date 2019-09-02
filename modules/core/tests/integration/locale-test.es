/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { httpGet } from '../../../core/http';
import { LOCALE_PATH } from '../../../core/i18n';
import console from '../../../core/console';
import {
  expect,
  waitFor,
} from '../../../tests/core/integration/helpers';

/**
 * Loads a resource URL from the xpi.
 *
 * Wraps httpGet in a try-catch clause. We need to do this, because when
 * trying to load a non-existing file from an xpi via xmlhttprequest, Firefox
 * throws a NS_ERROR_FILE_NOT_FOUND exception instead of calling the onerror
 * function.
 *
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=827243 (probably).
 */
function loadResource(url, callback, onerror) {
  try {
    return httpGet(url, callback, onerror, 3000);
  } catch (e) {
    console.log(`Could not load resource ${url} from the xpi`,
      'core/http.httpHandler');
    if (onerror) {
      onerror();
    }
  }
  return undefined;
}

export default function () {
  describe.skip('Should load locales', function () {
    this.retries(1);

    it('should load locales files', function () {
      // Load locales
      const langs = ['de', 'en', 'fr'];
      const locales = new Map();
      langs.forEach(function (lang) {
        loadResource(
          `${LOCALE_PATH}/${lang}/messages.json`,
          req => locales.set(lang, req.response)
        );
      });

      return waitFor(function () {
        return locales.size === langs.length;
      }).then(() => { expect(locales.size).to.equal(langs.length); });
    });
  });
}
