/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable global-require */
export function loadTranslation(url, locale) {
  switch (locale) {
    case 'de':
      return require('../../_locales/de/cliqz.json');
    case 'fr':
      return require('../../_locales/fr/cliqz.json');
    default:
      return require('../../_locales/en/cliqz.json');
  }
}
/* eslint-enable global-require */

export const SUPPORTED_LANGS = ['de', 'en', 'fr'];
export const locale = {};
export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = false;
export const getMessage = () => {};
