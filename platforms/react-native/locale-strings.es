/* eslint global-require: 0 */
export default function (url, locale) {
  switch (locale) {
    case 'de':
      return require('../static/locale/de/cliqz.json');
    case 'fr':
      return require('../static/locale/fr/cliqz.json');
    case 'es':
      return require('../static/locale/es/cliqz.json');
    case 'pt':
      return require('../static/locale/pt/cliqz.json');
    case 'pl':
      return require('../static/locale/pl/cliqz.json');
    case 'ru':
      return require('../static/locale/ru/cliqz.json');
    case 'it':
      return require('../static/locale/it/cliqz.json');
    default:
      return require('../static/locale/en/cliqz.json');
  }
}
