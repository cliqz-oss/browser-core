import { getLang } from '../platform/browser';
import config from './config';
import getLocaleObject from '../platform/locale-strings';
import getSupportedLanguage from '../platform/language/supported-langs';

export const getLanguageFromLocale = locale => locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];

const i18n = {
  locale: {},
  currLocale: '',
  LOCALE_PATH: `${config.baseURL}static/locale`,
};

const getLocaleFile = (locale) => {
  const url = `${i18n.LOCALE_PATH}/${locale}/cliqz.json`;
  // Warning - sync request
  const localeObject = getLocaleObject(url, locale);
  i18n.currLocale = locale;
  i18n.locale.default = i18n.locale[locale] = localeObject;
};

const setLang = (locale) => {
  const lang = getLanguageFromLocale(locale);
  const supportedLang = getSupportedLanguage(lang);

  i18n.PREFERRED_LANGUAGE = locale;
  getLocaleFile(supportedLang);
};

const loadTranslation = () => setLang(getLang());

export function getMessage(key, substitutions = []) {
  if (!key) {
    return '';
  }

  if (Object.keys(i18n.locale).length === 0) {
    loadTranslation();
  }

  const str = (i18n.locale[i18n.currLocale][key] || { message: key }).message || key;

  let subs = substitutions;

  if (!Array.isArray(substitutions)) {
    subs = [substitutions];
  }

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

export default i18n;
