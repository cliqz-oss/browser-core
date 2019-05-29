/* eslint-disable global-require */
export function loadTranslation(url, locale) {
  switch (locale) {
    case 'de':
      return require('../static/locale/de/cliqz.json');
    case 'fr':
      return require('../static/locale/fr/cliqz.json');
    default:
      return require('../static/locale/en/cliqz.json');
  }
}
/* eslint-enable global-require */

export const SUPPORTED_LANGS = ['de', 'en', 'fr'];
export const locale = {};
export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = false;
export const getMessage = () => {};
