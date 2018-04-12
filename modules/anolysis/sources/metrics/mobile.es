export default [
  // mobile telemetry
  // TODO: define metrics here, and create analysis in `analysis` folder
  // TODO: align with desktop
  // TODO: move to platform
  // TODO: at the moment only `number` and `string` types are allowed in
  // aggregated signals. We need to think about if it's safe to allow others as
  // well.
  // mobile_result_selection: aggregate('mobile_result_selection', {
  //   needsGid: true,
  //   schema: {
  //     properties: {
  //       current_position: { type: 'number' }, // result card index (zero based)
  //       position_type: {
  //         type: 'array',
  //         items: { type: 'string' },
  //       }, // result type
  //       tap_position: {
  //         type: 'array',
  //         items: { type: 'number' },
  //       }, // [number] x, y position of the tap
  //     },
  //   },
  // }),

  // mobile_swipe: aggregate('mobile_swipe', {
  //   needsGid: true,
  //   schema: {
  //     properties: {
  //       swipe_direction: {
  //         type: 'string',
  //         enum: ['left', 'right'],
  //       },
  //       index: { type: 'number' }, // card index (zero based)
  //       show_duration: { type: 'number' }, // duration since last card was shown
  //       card_count: { type: 'number' }, // visible cards count (including search engine card)
  //       position_type: {
  //         type: 'array',
  //         items: { type: 'string' },
  //       }, // result type
  //     },
  //   },
  // }),

  // aggregate('mobile_results_rendered', {
  //   needsGid: true,
  //   schema: {
  //     properties: {
  //       result_count: { type: 'number' }, // number of results
  //     },
  //   },
  // }),
];
