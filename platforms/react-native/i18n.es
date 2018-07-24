/* eslint global-require: 0 */
export const locale = {};
export function loadTranslation(localeCode) {
  switch (localeCode) {
    case 'de':
      locale[localeCode] = require('../static/locale/de/messages.json');
      break;
    case 'fr':
      locale[localeCode] = require('../static/locale/fr/messages.json');
      break;
    case 'es':
      locale[localeCode] = require('../static/locale/es/messages.json');
      break;
    case 'pt':
      locale[localeCode] = require('../static/locale/pt/messages.json');
      break;
    case 'pl':
      locale[localeCode] = require('../static/locale/pl/messages.json');
      break;
    case 'ru':
      locale[localeCode] = require('../static/locale/ru/messages.json');
      break;
    case 'it':
      locale[localeCode] = require('../static/locale/it/messages.json');
      break;
    default:
      locale[localeCode] = require('../static/locale/en/messages.json');
  }
}

export const LOCALE_PATH = null;
export const IMPLEMENTS_GET_MESSAGE = false;
export const getMessage = () => {};
export const SUPPORTED_LANGS = ['de', 'fr', 'es', 'pt', 'pl', 'ru', 'it', 'en'];
