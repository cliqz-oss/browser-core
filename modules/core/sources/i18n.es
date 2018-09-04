import { getLocale } from '../platform/browser';
import {
  SUPPORTED_LANGS,
  getMessage as _getMessage,
  locale as _locale,
  loadTranslation,
  IMPLEMENTS_GET_MESSAGE,
} from '../platform/i18n';

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

const i18n = {
  locale: _locale,
  get currLocale() {
    return getSupportedLanguage(this.PLATFORM_LANGUAGE);
  },
  get PLATFORM_LOCALE() {
    return getLocale();
  },
  get PLATFORM_LANGUAGE() {
    return getLanguageFromLocale(this.PLATFORM_LOCALE);
  },
};

export default i18n;

export function getMessage(key, substitutions = []) {
  if (IMPLEMENTS_GET_MESSAGE) {
    return _getMessage(key, substitutions);
  }

  if (!key) {
    return '';
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
