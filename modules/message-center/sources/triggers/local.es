import utils from '../../core/utils';

const LOCAL_DATA = [
  {
    id: 'import',
    active: true,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab_app_top_box_import_bookmarks_hdr'),
    description: '',
    icon: './images/import-bookmarks.svg',
    cta_text: utils.getLocalizedString('freshtab_app_top_box_import_bookmarks_cta'),
    cta_url: 'home-action:openImportDialog',
    later_text: utils.getLocalizedString('freshtab_app_top_box_import_bookmarks_later'),
    handler: 'MESSAGE_HANDLER_FRESHTAB_TOP',
    position: 'top',
    rules: [
      {
        fn: 'cliqzVersionCheck',
        value: '1.20.0',
      },
      {
        fn: 'daysSinceInstallCheck',
        value: 14,
      }
    ]
  },
  {
    id: 'new-cliqz-tab',
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab_app_middle_box_new_cliqz_tab_hdr'),
    description: utils.getLocalizedString('freshtab_app_middle_box_new_cliqz_tab_desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab_app_middle_box_new_cliqz_tab_cta'),
    cta_url: 'home-action:settings',
    handler: 'MESSAGE_HANDLER_FRESHTAB_MIDDLE',
    position: 'middle'
  },
  {
    id: 'blue-theme',
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab_app_middle_box_blue_theme_hdr'),
    description: utils.getLocalizedString('freshtab_app_middle_box_blue_theme_desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab_app_middle_box_blue_theme_cta'),
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
    title: utils.getLocalizedString('freshtab_app_middle_box_french_news_hdr'),
    description: utils.getLocalizedString('freshtab_app_middle_box_french_news_desc'),
    icon: './images/settings-icon_blue.svg',
    cta_text: utils.getLocalizedString('freshtab_app_middle_box_french_news_cta'),
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
    active: false,
    version: 1,
    type: 'notification',
    title: utils.getLocalizedString('freshtab_app_middle_box_promote_mobile_hdr'),
    description: utils.getLocalizedString('freshtab_app_middle_box_promote_mobile_desc'),
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
