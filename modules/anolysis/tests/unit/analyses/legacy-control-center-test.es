
require('../telemetry-schemas-test-helpers')({
  name: 'control-center-interaction',
  metrics: [
    'report_url', 'attrack', 'attrack_switch', 'attrack_off_select', 'attrack_fair',
    'attrack_details_company_section', 'adblock', 'adblock_switch', 'adblock_off_select',
    'adblock_fair', 'adblock_details_company_section', 'antiphishing_switch', 'moresearch',
    'offerz', 'complementary_search', 'search_humanweb', 'search-index-country', 'search_adult',
    'search_location', 'search_proxy', 'search_transparency', 'info_help', 'offerz_main',
    'offerz_location',
  ].map(type => `metrics.legacy.control_center.${type}`),
});
