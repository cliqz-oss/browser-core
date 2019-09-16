/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default {
  name: 'analyses.controlCenter.interactions',
  version: 1,
  needsGid: true,
  sendToBackend: true,
  generate: ({ records }) => [
    {
      shows: records.get('metrics.controlCenter.show').length,
      clicks: {
        pause: records.get('metrics.controlCenter.click.pause').length,
        resume: records.get('metrics.controlCenter.click.resume').length,
        trustSite: records.get('metrics.controlCenter.click.trustSite').length,
        restrictSite: records.get('metrics.controlCenter.click.restrictSite').length,
      }
    }
  ],
  schema: {
    required: ['shows', 'clicks'],
    properties: {
      shows: { type: 'integer', minimum: 0 },
      clicks: {
        required: ['pause', 'resume', 'trustSite', 'restrictSite'],
        properties: {
          pause: { type: 'integer', minimum: 0 },
          resume: { type: 'integer', minimum: 0 },
          trustSite: { type: 'integer', minimum: 0 },
          restrictSite: { type: 'integer', minimum: 0 },
        }
      }
    },
  }
};
