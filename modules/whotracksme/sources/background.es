/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import background from '../core/base/background';
import { getGeneralDomain } from '../core/tlds';
import ResourceLoader from '../core/resource-loader';
import logger from './logger';
import config from '../core/config';
import { getMessage } from '../core/i18n';

const TRACKER_CATEGORIES = [
  'audio_video_player',
  'site_analytics',
  'unknown',
  'cdn',
  'misc',
  'hosting',
  'comments',
  'customer_interaction',
  'extensions',
  'advertising',
  'pornvertising',
  'social_media',
  'essential',
];

/**
  @namespace <namespace>
  @class Background
 */
export default background({
  /**
    @method init
    @param settings
  */
  async init(settings) {
    try {
      this._loader = new ResourceLoader(['privacy-score', 'privacy_score.json'], {
        remoteURL: `${settings.TRACKER_SCORE_URL}`,
        cron: 7 * 24 * 60 * 60 * 1000
      });
      this.trackerInfo = await this._loader.load();
      this._loader.onUpdate((data) => {
        this.trackerInfo = data;
      });
    } catch (e) {
      logger.info('Failed loading tracker database', e);
    }
  },

  unload() {

  },

  events: {

  },

  actions: {
    getTrackingInfo(urls) {
      return urls.map((url) => {
        const domain = getGeneralDomain(url);
        const [total, ...trackers] = this.trackerInfo[domain] || [0];
        const reportUrl = `https://whotracks.me/websites/${domain}.html`;
        const response = {
          domain,
          reportUrl,
          total,
          debug: config.environment === 'production',
        };
        if (total === 0) {
          response.trackers = [{
            id: 'default',
            name: getMessage('whotracksme_category_default'),
            numTotal: 0,
          }];
        } else {
          response.trackers = trackers.map((numTotal, i) => {
            const id = TRACKER_CATEGORIES[i];
            return {
              id,
              name: getMessage(`whotracksme_category_${id}`),
              numTotal,
            };
          }).filter(({ numTotal }) => numTotal !== 0);
        }
        return response;
      });
    }
  },
});
