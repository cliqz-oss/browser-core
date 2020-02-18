/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const DEMOGRAPHICS = [
  'install_date',
  'product',
  'extension',
];

export default [
  {
    name: 'core.metric.telemetry.opt-out',
    description: `
In case of user telemetry opt-out, this is the last signal that will be sent to
us, and it does not contain any behavioral information: we simply use it for
counting purposes.
    `,
    sendToBackend: {
      version: 1,
      demographics: DEMOGRAPHICS,
    },
    schema: {},
  },
  {
    name: 'core.metric.telemetry.opt-in',
    description: 'Allows us to count how many users decide to opt-into telemetry',
    sendToBackend: {
      version: 1,
      demographics: DEMOGRAPHICS,
    },
    schema: {},
  },
];
