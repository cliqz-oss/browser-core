import utils from '../../core/utils';

const LOCAL_DATA = [
  {
    id: 'new-cliqz-tab',
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.new-cliqz-tab-cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  },
  {
    id: 'blue-theme',
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.blue-theme-cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    rules: [
      {
        fn: 'cliqzVersionCheck',
        value: '1.16.0',
      }
    ]
  },
  {
    id: 'french-news',
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.french-news-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.french-news-desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab.app.middle-box.french-news-cta'),
    cta_url: 'home-action:settings&news',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    rules: [
      {
        fn: 'locale',
        value: 'fr',
      },
      {
        fn: 'currentNewsLanguageIsNot',
        value: 'fr'
      },
    ]
  },
  {
    id: 'promote-mobile',
    active: true,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab.app.middle-box.promote-mobile-hdr'),
    description: utils.getLocalizedString('freshtab.app.middle-box.promote-mobile-desc'),
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle',
    buttons: [
      {
        id: 'promote-apple',
        src: 'apple-badge.svg',
        class: 'apple-badge',
        link: {
          en: 'https://itunes.apple.com/us/app/cliqz-browser/id1065837334',
          de: 'https://itunes.apple.com/de/app/cliqz-browser-suchmaschine/id1065837334?mt=8'
        }
      },
      {
        id: 'promote-android',
        src: 'android-badge.svg',
        class: 'android-badge',
        link: {
          en: 'https://play.google.com/store/apps/details?hl=en&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Den%26cliqz_campaign%3Dmobile_en',
          de: 'https://play.google.com/store/apps/details?hl=de&id=com.cliqz.browser&referrer=utm_source%3Dcliqz%26utm_medium%3Dproduct%26utm_campaign%3Dde%26cliqz_campaign%3Dmobile_de'
        }
      }
    ],
    rules: [
      {
        fn: 'cliqzVersionCheck',
        value: '1.16.0',
      }
    ]
  }
];

export default function getLocalMessages() {
  return Promise.resolve(LOCAL_DATA);
}
