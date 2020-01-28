/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const configBase = require('./ghostery-tab-base');
const publish = require('./common/publish');

const id = '{0ea88bc4-03bd-4baa-8153-acc861589c1c}';
const CUSTOM_MANIFEST_ENTRY = `
  ,"applications": {
    "gecko": {
      "id": "${id}",
      "strict_min_version": "57"
    }
  }
`;

module.exports = Object.assign({}, configBase, {
  CUSTOM_MANIFEST_ENTRY,
  CUSTOM_MANIFEST_PAGE_ACTION_POPUP: '',
  QUICK_SEARCH_TOGGLE: 'Ctrl+Shift+Space',
  publish: `web-ext sign -a . -s build/ --api-key=$UPLOAD_API_KEY --api-secret=$UPLOAD_API_SECRET --timeout=360000 && ${publish.toEdgeForGhostery('ghostery_start_tab_nightly', 'ghostery-tab-firefox', 'xpi')}`,
  settings: Object.assign({}, configBase.settings, {
    id,
    channel: 'GT02',
    SHOW_ONBOARDING_OVERLAY: true,
    telemetry: {
      demographics: {
        ...configBase.settings.telemetry.demographics,
        platform: 'firefox',
      },
    },
  }),
  modules: configBase.modules.concat([
    'onboarding-overlay',
  ]),
  bundles: configBase.bundles.concat([
    'onboarding-overlay/app.bundle.js',
  ]),
  buildTargets: {
    firefox: 57,
  },
});
