/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default [
  {
    name: 'core.metric.ping.daily',
    description: 'Measure daily active users and day-to-day retention',
    sendToBackend: {
      version: 1,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 14,
      },
    },
    offsets: [0],
    generate: () => [{ }],
    schema: { },
  },
  // TODO: send only once per month
  {
    name: 'core.metric.ping.monthly',
    description: 'Measure monthly active users and month-to-month retention',
    sendToBackend: {
      version: 1,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'platform',
        'product',
      ],
      // TODO: switch to 'relative' as soon as this signal is sent
      //       only once per month (and not daily); for now, keep
      //       absolute to be able to calculate monthly active
      //       users (based on ephemerid, not individual signals)
      ephemerid: {
        kind: 'absolute',
        unit: 'month',
        n: 1,
      },
    },
    offsets: [0],
    generate: () => [{ }],
    schema: { },
  },
];
