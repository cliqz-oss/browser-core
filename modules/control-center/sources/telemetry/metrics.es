/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

function ccMetric(target, { actions = ['click'], states, index = false } = {}) {
  const withState = states !== undefined && states.length > 0;
  const required = ['target', 'action'];
  const properties = {
    target: { type: 'string', enum: [target] },
    action: { type: 'string', enum: actions },
  };
  if (withState) {
    required.push('state');
    properties.state = { type: 'string', enum: states };
  }
  if (index) {
    required.push('index');
    properties.index = { type: 'string' };
  }
  return {
    name: `metrics.legacy.control_center.${target}`,
    schema: {
      required,
      properties,
    }
  };
}

const SEARCH_ENGINES = [
  'Google',
  'Bing',
  'Amazon.de',
  'DuckDuckGo',
  'eBay',
  'Ecosia',
];
const SWITCH_STATES = ['off', 'on'];
const ACCORDIAN_STATES = ['expanded', 'collapsed'];
const BOOL_STATES = ['false', 'true'];

export default [
  ccMetric('report_url'),
  ccMetric('attrack'),
  ccMetric('attrack_switch', { states: SWITCH_STATES }),
  ccMetric('attrack_off_select', { states: ['off_website', 'off_all'] }),
  ccMetric('attrack_fair', { states: SWITCH_STATES }),
  ccMetric('attrack_details_company_section', { index: true }),
  ccMetric('adblock', ['click']),
  ccMetric('adblock_switch', { states: SWITCH_STATES }),
  ccMetric('adblock_off_select', { states: ['off_website', 'off_domain', 'off_all'] }),
  ccMetric('adblock_fair', { states: SWITCH_STATES }),
  ccMetric('adblock_details_company_section', { index: true }),
  ccMetric('antiphishing_switch', { states: SWITCH_STATES }),
  ccMetric('antiphishing_off_select', { states: ['critical'] }),
  ccMetric('moresearch', { states: ACCORDIAN_STATES }),
  ccMetric('offerz', { states: ACCORDIAN_STATES }),
  ccMetric('complementary_search', { states: SEARCH_ENGINES.map(e => `search_engine_change_${e}`) }),
  ccMetric('search_humanweb', { states: ['disabled', 'enabled'] }),
  ccMetric('search-index-country', { states: [
    'de',
    'fr',
    'us',
    'es',
    'it',
    'gb',
    'at',
  ] }),
  ccMetric('search_adult', { states: ['liberal', 'conservative', 'moderate'] }),
  ccMetric('search_location', { states: ['no', 'ask', 'yes'] }),
  ccMetric('search_proxy', { states: BOOL_STATES }),
  ccMetric('search_transparency'),
  ccMetric('info_help'),
  ccMetric('offerz_main', { states: BOOL_STATES }),
  ccMetric('offerz_location', { states: ['0', '1'] }),
  ccMetric('offerz_main_learn_more'),
  ccMetric('autoconsent_switch', { states: ['inactive', 'active', 'off_all'] }),
  ccMetric('autoconsent_deny', { states: BOOL_STATES }),
  ccMetric('autoconsent_off_select', { states: ['critical'] }),
];
