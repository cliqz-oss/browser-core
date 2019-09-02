/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable camelcase */
/*
freshtab-settings-interaction is used to know if and
how users interact with theme settings on freshtab.
*/

import inject from '../../core/kord/inject';

function makeInteractionSchema(name, states) {
  return {
    [name]: {
      required: [
        'clicks',
        'state',
      ],
      type: 'object',
      properties: {
        clicks: {
          type: 'integer',
          minimum: 0,
        },
        state: {
          type: 'string',
          enum: states,
        }
      }
    },
  };
}

export default {
  name: 'freshtab-settings-interactions',
  needsGid: true,
  version: 1,
  generate: async ({ records }) => {
    const freshtab = inject.module('freshtab');

    if (freshtab.isEnabled() === false) {
      return [];
    }

    const freshtabBrowserThemeSignals = records.get('freshtab.prefs.browserTheme');
    const freshtabBlueThemeSignals = records.get('freshtab.home.settings.click.cliqz_theme');

    return [{
      blueTheme: {
        clicks: freshtabBlueThemeSignals.length,
        state: await freshtab.action('isBlueThemeEnabled') ? 'on' : 'off',
      },
      browserTheme: {
        clicks: freshtabBrowserThemeSignals.length,
        state: await freshtab.action('getBrowserTheme'),
      }
    }];
  },
  schema: {
    required: [
      'blueTheme',
      'browserTheme',
    ],
    type: 'object',
    properties: {
      ...makeInteractionSchema('blueTheme', ['on', 'off']),
      ...makeInteractionSchema('browserTheme', ['dark', 'light']),
    }
  }
};
