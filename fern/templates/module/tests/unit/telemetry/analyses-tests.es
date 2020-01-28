/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global chai */

// require('../../../anolysis/unit/telemetry-schemas-test-helpers')({
//   // This is the name of the aggregation you are testing.
//   name: 'analyses.<module>.<name>',
//   metrics: [
//     // This array should contain the names of metrics that your aggregation
//     // (i.e.: analysis) depends upon. These are the ones you access using
//     // `records.get('name.of.metrics')`. If you do not require any, you can
//     // leave this array empty.
//   ],
//   schemas: [
//     // path to files defining schemas for this module. If your schemas are
//     // defined in 'modules/freshtab/sources/telemetry/metrics.es' then you
//     // should have the following value:
//     'freshtab/telemetry/metrics',
//   ],
//   mock: {
//     // Optionally define custom mocks for testing this particular analysis.
//     // This is useful if your analysis depends on some imported modules or if
//     // you want to change the context in which it will run (e.g.: custom prefs
//     // values). This `mock` object is used in exactly the same way as the one
//     // you specify as argument to `describeModule(...)`.
//     // 'import.path': { ... }
//   },
//   tests: (generateAnalysisResults) => {
//     // `generateAnalysisResults` is a function which you can use to generate
//     // results for your aggregation given a set of metrics. This function
//     // takes as argument an object where keys are names of metrics your
//     // aggregation depends upon and values are arrays of values of said metrics.
//     it('generate aggregation', async () => {
//       const generatedSignals = await generateAnalysisResults({
//         metricName: [
//           { value: 'foo' },
//           { value: 'bar' },
//         ],
//       });
//       chai.expect(generatedSignals).to.not.be.empty;
//     });
//   },
// });
