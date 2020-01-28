/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

require('../../../anolysis/unit/telemetry-schemas-test-helpers')({
  name: 'control-center-interaction',
  metrics: [
    'report_url', 'attrack', 'attrack_switch', 'attrack_off_select', 'attrack_fair',
    'attrack_details_company_section', 'adblock', 'adblock_switch', 'adblock_off_select',
    'adblock_fair', 'adblock_details_company_section', 'antiphishing_switch', 'moresearch',
    'offerz', 'complementary_search', 'search_humanweb', 'search-index-country', 'search_adult',
    'search_location', 'search_proxy', 'search_transparency', 'info_help', 'offerz_main',
    'offerz_location',
  ].map(type => `metrics.legacy.control_center.${type}`),
  schemas: [
    'control-center/telemetry/metrics',
    'control-center/telemetry/analyses',
  ],
});
