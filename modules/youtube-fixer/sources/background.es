/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import webRequest from '../platform/webrequest';
import cookies from '../platform/cookies';
import inject from '../core/kord/inject';
import metrics from './telemetry/youtube-error';
import Logger from '../core/logger';
import prefs from '../core/prefs';

const logger = Logger.get('youtube-fixer', { level: 'log' });

async function isAntitrackingEnabled() {
  return (
    prefs.get('module.antitracking.enabled', true)
    && !(await inject
      .module('antitracking')
      .action('isWhitelisted', 'https://www.youtube.com/'))
  );
}

function statusListener(details) {
  if (details.statusCode === 500) {
    logger.info(
      'error code from YT, will clean cookies',
      details.url,
      details.statusCode,
    );
    cookies.getAll({ domain: 'youtube.com' }).then(async (ckis) => {
      inject.service('telemetry', ['push']).push(
        {
          statusCode: details.statusCode,
          cookies: ckis.length,
          antitrackingEnabled: await isAntitrackingEnabled(),
          cookieMonsterEnabled: prefs.get(
            'module.cookie-monster.enabled',
            true,
          ),
          cmNonTrackerEnabled: prefs.get('cookie-monster.nonTracker', false),
          cmSessionEnabled: prefs.get('cookie-monster.expireSession', false),
          affected: prefs.get('youtube-fixer.affected', false),
        },
        'youtube-fixer.metric.cookieError',
      );
      const deletions = ckis.map((cookie) => {
        const protocol = cookie.secure ? 'https' : 'http';
        const cookieDelete = {
          name: cookie.name,
          url: `${protocol}://${cookie.domain}${cookie.path}`,
          storeId: cookie.storeId,
        };
        if (cookie.domain.startsWith('.')) {
          cookieDelete.url = `${protocol}://${cookie.domain.substring(1)}${
            cookie.path
          }`;
        }
        if (cookieDelete.firstPartyDomain) {
          cookieDelete.firstPartyDomain = cookie.firstPartyDomain;
        }
        return cookies.remove(cookieDelete);
      });
      await Promise.all(deletions);
      if (!prefs.get('youtube-fixer.affected', false)) {
        prefs.set('youtube-fixer.affected', true);
        // take an action to see if it fixes the problem
        const choice = Math.floor(Math.random() * 4);
        // disable CM
        const core = inject.module('core');
        await core.action('disableModule', 'cookie-monster');
        if (choice === 1) {
          logger.info('Disabling cookie-monster expire session policy');
          prefs.set('cookie-monster.expireSession', false);
        } else if (choice === 2) {
          logger.info('Disabling cookie-monster nonTracker policy');
          prefs.set('cookie-monster.nonTracker', false);
        }
        // choice === 0: CM stays disabled
        if (choice !== 0) {
          // re-enable CM to load new settings.
          await core.action('enableModule', 'cookie-monster');
        } else {
          logger.info('Disabling cookie-monster');
        }
      }
    });
  }
}

/**
 * This module aims to detect and fix issues loading Youtube by deleting cookies when an error
 * 500 is encountered. The telemetry will enable us to know how widespread the problem is, and
 * what modules may be contributing to it.
  @namespace <namespace>
  @class Background
 */
export default background({
  requiresServices: ['telemetry'],

  /**
    @method init
    @param settings
  */
  init() {
    inject.service('telemetry', ['register']).register(metrics);
    webRequest.onHeadersReceived.addListener(statusListener, {
      urls: ['https://www.youtube.com/*'],
      types: ['main_frame', 'sub_frame', 'xmlhttprequest'],
    });
  },

  unload() {
    webRequest.onHeadersReceived.removeListener(statusListener);
  },

  events: {},

  actions: {},
});
