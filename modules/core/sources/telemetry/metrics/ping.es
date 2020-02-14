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
      version: 2,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'product',
        'extension',
        'browser',
        'os',
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
  {
    name: 'core.metric.ping.weekly',
    description: 'Measure weekly active users and week-to-week retention',
    sendToBackend: {
      version: 2,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'product',
        'extension',
        'browser',
        'os',
      ],
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 31, // one month from install
      },
    },
    offsets: [0],
    rate: 'week',
    generate: () => [{ }],
    schema: { },
  },
  {
    name: 'core.metric.ping.monthly',
    description: 'Measure monthly active users and month-to-month retention',
    sendToBackend: {
      version: 2,
      demographics: [
        'campaign',
        'country',
        'install_date',
        'product',
        'extension',
        'browser',
        'os',
      ],
      ephemerid: {
        kind: 'relative',
        unit: 'day',
        n: 6 * 31, // six months from install
      },
    },
    offsets: [0],
    rate: 'month',
    generate: () => [{ }],
    schema: { },
  },
];
