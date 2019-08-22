/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint global-require: 0 */
export const locale = {};
export function loadTranslation(localeCode) {
  switch (localeCode) {
    case 'de':
      locale[localeCode] = require('../../_locales/de/messages.json');
      break;
    case 'fr':
      locale[localeCode] = require('../../_locales/fr/messages.json');
      break;
    case 'es':
      locale[localeCode] = require('../../_locales/es/messages.json');
      break;
    case 'pt':
      locale[localeCode] = require('../../_locales/pt/messages.json');
      break;
    case 'pl':
      locale[localeCode] = require('../../_locales/pl/messages.json');
      break;
    case 'ru':
      locale[localeCode] = require('../../_locales/ru/messages.json');
      break;
    case 'it':
      locale[localeCode] = require('../../_locales/it/messages.json');
      break;
    default:
      locale[localeCode] = require('../../_locales/en/messages.json');
  }
}

export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = false;
export const getMessage = () => {};
export const SUPPORTED_LANGS = ['de', 'fr', 'es', 'pt', 'pl', 'ru', 'it', 'en'];
