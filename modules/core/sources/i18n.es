/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getLocale } from '../platform/browser';
import {
  SUPPORTED_LANGS,
  getMessage as _getMessage,
  locale as _locale,
  loadTranslation,
  IMPLEMENTS_GET_MESSAGE,
} from '../platform/i18n';
import prefs from '../core/prefs';

const fallbackWhitelist = JSON.stringify([
  'de-DE',
  'en-US',
  'da-DK',
  'de',
  'en-GB',
  'fr-FR',
  'en-DE',
  'es-ES',
  'ru-RU',
  'nl-NL',
  'en',
  'de-CH',
  'it-IT',
  'de-AT',
  'sv-SE',
  'pl-PL',
  'nb-NO',
  'fi-FI',
  'en-DK',
  'hu-HU',
  'fr'
]);

export {
  LOCALE_PATH
} from '../platform/i18n';

export const getLanguageFromLocale = locale => locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];

function getSupportedLanguage(lang) {
  if (SUPPORTED_LANGS.indexOf(lang) !== -1) {
    return lang;
  }

  return 'en';
}

function whitelistedLocale() {
  let sets;
  try {
    sets = JSON.parse(prefs.get('config_locale_whitelist', fallbackWhitelist));
  } catch (e) {
    sets = JSON.parse(fallbackWhitelist);
    // eslint-disable-next-line
    console.log(`Locale - Malformed JSON: ${e}`);
  }
  let locale = getLocale();
  if (!sets.includes(locale)) {
    // fallback to english if no whitelisted locale is present
    locale = 'en';
  }
  return locale;
}

const i18n = {
  locale: _locale,
  get currLocale() {
    return getSupportedLanguage(this.PLATFORM_LANGUAGE);
  },
  get PLATFORM_LOCALE() {
    return whitelistedLocale();
  },
  get PLATFORM_LANGUAGE_FILTERED() {
    return getLanguageFromLocale(whitelistedLocale());
  },
  get PLATFORM_LANGUAGE() {
    return getLanguageFromLocale(getLocale());
  },
};

export default i18n;

export function getMessage(key, substitutions = []) {
  // 'undefined' or 'null' raise an exception in _getMessage()
  if (!key) {
    return '';
  }

  if (IMPLEMENTS_GET_MESSAGE) {
    return _getMessage(key, substitutions);
  }

  if (Object.keys(_locale).length === 0) {
    loadTranslation(i18n.currLocale);
  }

  const str = (_locale[i18n.currLocale][key] || { message: key }).message || key;

  let subs = substitutions;

  if (!Array.isArray(substitutions)) {
    subs = [substitutions];
  }

  subs = subs.map(String); // Firefox accepts number as substitutions but chrome does not

  function replacer(matched, index, dollarSigns) {
    if (index) {
      const i = parseInt(index, 10) - 1;
      return i in subs ? subs[i] : '';
    }

    // For any series of contiguous `$`s, the first is dropped, and
    // the rest remain in the output string.
    return dollarSigns;
  }

  return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
}
