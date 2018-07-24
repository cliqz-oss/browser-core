/* eslint-disable import/no-mutable-exports */
const EN = {
  title: 'World Cup 2018',
  subtitle_powered: 'Powered by',
  subtitle_by: 'Kicker Online',
  day: 'Day',
  days: 'Days',
  remainings: 'Remaining',
  download: 'On the go?  Get Cliqz Mobile.',
  android: 'https://play.google.com/store/apps/details?hl=en&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Den%26cliqz_campaign%3Dmobile_en',
  ios: 'https://itunes.apple.com/us/app/cliqz-browser/id1065837334',
  next_update: 'Next update in:',
  yesterday: 'Yesterday',
  today: 'Today',
  tomorrow: 'Tomorrow',
};

const DE = {
  title: 'Fußball-WM 2018',
  subtitle_powered: 'Powered by',
  subtitle_by: 'Kicker Online',
  day: 'Tag',
  days: 'Tage',
  remainings: ' noch',
  download: 'Unterwegs? Hol dir Cliqz Mobile.',
  android: 'https://play.google.com/store/apps/details?hl=de&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Dde%26cliqz_campaign%3Dmobile_de',
  ios: 'https://itunes.apple.com/de/app/cliqz-browser-suchmaschine/id1065837334?mt=8',
  next_update: 'Nächstes Update in:',
  yesterday: 'Gestern',
  today: 'Heute',
  tomorrow: 'Morgen',
};

const FR = {
  title: 'Coupe du Monde 2018',
  subtitle_powered: 'Powered by',
  subtitle_by: 'Kicker Online',
  day: 'Jour',
  days: 'Jours',
  remainings: 'Restant',
  download: 'En chemin? Téléchargez Cliqz pour Mobile',
  android: 'https://play.google.com/store/apps/details?hl=fr&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Dfr%26cliqz_campaign%3Dmobile_fr',
  ios: 'https://itunes.apple.com/fr/app/cliqz-browser/id1065837334',
  next_update: 'Prochaine mise à jour dans:',
  yesterday: 'Hier',
  today: 'Aujourd’hui',
  tomorrow: 'Demain',
};

const lang = window.location.search.slice(1);
let i18n;

switch (lang) {
  case 'lang=de':
    i18n = DE;
    break;
  case 'lang=en':
    i18n = EN;
    break;
  case 'lang=fr':
    i18n = FR;
    break;
  default:
    i18n = DE;
}

export default i18n;
