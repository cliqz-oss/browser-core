import { getMessage } from '../../core/i18n';

export default function getLocalMessages() {
  const LOCAL_DATA = [
    {
      id: 'import',
      active: true,
      version: 2,
      type: 'notification',
      title: getMessage('freshtab_app_top_box_import_bookmarks_hdr'),
      icon: './images/import-bookmarks.svg',
      cta_text: getMessage('freshtab_app_top_box_import_bookmarks_cta'),
      cta_url: 'home-action:openImportDialog',
      later_text: getMessage('freshtab_app_top_box_import_bookmarks_later'),
      handler: 'MESSAGE_HANDLER_FRESHTAB_TOP',
      position: 'top',
      rules: [
        {
          fn: 'installDaysLesserThan',
          value: 14,
        },
        {
          fn: 'isDesktopBrowser'
        }
      ]
    },
    {
      id: 'adblocker',
      active: true,
      version: 1,
      type: 'notification',
      title: getMessage('freshtab_cliqz_post_adblock_title'),
      description: getMessage('freshtab_cliqz_post_adblock_description'),
      icon: './images/adblocker-on.png',
      supplementary_link_text: getMessage('freshtab_cliqz_post_adblock_learn_more_text'),
      supplementary_link_url: getMessage('freshtab_cliqz_post_adblock_learn_more_url'),
      cta_text: '',
      cta_url: '',
      cta_tooltip: '',
      handler: 'MESSAGE_HANDLER_FRESHTAB_CLIQZPOST',
      position: 'post',
      show_later: false,
      rules: [
        {
          fn: 'prefHasNotChanged',
          value: 'cliqz-adb',
        },
        {
          fn: 'installDaysSinceEpochLessThan',
          value: 18052, // Tue, Jun 05, 2019 - 1.37.0 released date
        },
      ],
    },
  ];

  return Promise.resolve(LOCAL_DATA);
}
