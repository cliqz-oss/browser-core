
// TODO: Add missing signals
// This signal is also meant as a way to keep track of possible types
// that can be included in analysis.
// const SCHEMA = {
//   needs_gid: true,
//   name: 'everything',
//   selectors: [
//     'activity_arrow_key',
//     'activity_browser_shutdown',
//     'activity_click',
//     'activity_dropdown_close',
//     'activity_dropdown_open',
//     'activity_key_stroke',
//     'activity_result_enter',
//     'activity_results',
//     'activity_results_done',
//     'activity_urlbar_blur',
//     'activity_urlbar_focus',
//     'cat_na',
//     'home_display',
//     'home_focus',
//     'home_hide',
//     'snippet_quality',
//     'startup_na',
//   ],
// };
// export default SCHEMA;


export default class {
  constructor() {
    this.name = 'everything';
    this.needs_gid = true;
  }

  generateSignals(aggregation) {
    return [{ id: this.name, data: aggregation }];
  }
}
