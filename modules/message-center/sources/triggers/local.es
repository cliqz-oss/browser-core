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
        }
      ]
    }
  ];

  return Promise.resolve(LOCAL_DATA);
}
