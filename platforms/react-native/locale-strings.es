/* eslint global-require: 0 */
export default function (url, locale) {
  switch (locale) {
    case 'de':
      return require('../static/locale/de/messages.json');
    case 'fr':
      return require('../static/locale/fr/messages.json');
    case 'es':
      return require('../static/locale/es/messages.json');
    case 'pt':
      return require('../static/locale/pt/messages.json');
    case 'pl':
      return require('../static/locale/pl/messages.json');
    case 'ru':
      return require('../static/locale/ru/messages.json');
    case 'it':
      return require('../static/locale/it/messages.json');
    default:
      return require('../static/locale/en/messages.json');
  }
}
