export default function (url, locale) {
  switch (locale) {
    case 'de':
      return require('../static/locale/de/cliqz.json');
    case 'fr':
      return require('../static/locale/fr/cliqz.json');
    default:
      return require('../static/locale/en/cliqz.json');
  }
}
