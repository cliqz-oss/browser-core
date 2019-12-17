/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const ghosteryBase = require('./ghostery-tab-base');

const id = 'ifnpgdmcliingpambkkihjlhikmbbjid';
const CUSTOM_MANIFEST_ENTRY = `
  ,"minimum_chrome_version": "55",
`;


module.exports = Object.assign({}, ghosteryBase, {
  CUSTOM_MANIFEST_ENTRY,
  CUSTOM_MANIFEST_PERMISSIONS: '"commands",',
  CUSTOM_MANIFEST_PAGE_ACTION_POPUP: '"default_popup": "popup/popup.html",',
  QUICK_SEARCH_TOGGLE: 'Ctrl+K',
  publish: `webstore upload --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --source ghostery_start_tab_nightly_-$VERSION.zip --extension-id ${id} && webstore publish --client-id=$UPLOAD_API_KEY --client-secret=$UPLOAD_API_SECRET --extension-id ${id}`,
  settings: Object.assign({}, ghosteryBase.settings, {
    channel: 'GT12',
  }),
  buildTargets: {
    chrome: 55,
  }
});
