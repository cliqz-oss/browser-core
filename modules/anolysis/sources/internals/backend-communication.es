/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import network from '../../platform/network';
import { isBetaVersion } from '../../platform/platform';

import prefs from '../../core/prefs';
import { httpPost } from '../../core/http';

import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';


/**
 * Helper function used to send a json `payload` to `url` using a POST request.
 * This returns a promise resolving to the answer if any, or rejecting on any
 * exception or wrong HTTP code.
 */
async function post(url, payload) {
  return new Promise((resolve, reject) => {
    httpPost(
      url,
      (req) => {
        try {
          const json = JSON.parse(req.response);
          resolve(json);
        } catch (ex) {
          reject(new Error(`Backend ${url} could not parse JSON: ${req.response}`));
        }
      },
      JSON.stringify(payload),
      reject,
      1000 * 15, // Request timeout = 15 seconds
    );
  });
}

/**
 * Takes care of the communications with the backend
 */


export default class Backend {
  constructor(config) {
    this.config = config;
    this.backendUrl = config.get('backend.url');
  }

  /**
   * Attach the `meta` attribute to each message sent to backend. This is common
   * to all messages (both analyses/metrics and demographics sending), which is
   * why we share the same logic and implement it in backend-communication. If a
   * `meta` attribute is already specified in `payload`, then its keys will take
   * precedence over default ones.
   */
  attachMetadata(payload) {
    const defaultMeta = {
      session: this.config.get('session'),

      // This allows us to filter out signals coming from developers in the
      // backend. This is not privacy breaching because all normal users will
      // have `false` as value for this attribute.
      dev: prefs.get('developer', false) === true,

      // The date for this signal is either the date of the data/metrics which
      // were aggregated to create it via an analysis, or the date of today if
      // it was not specified yet.
      date: getSynchronizedDate().format(DATE_FORMAT),

      // If this is a beta version of the extension. Allows us to compare changes
      // on master with the current production version.
      beta: isBetaVersion(),
    };

    // We return a copy of the signal with updated meta-data
    return {
      ...payload,
      meta: {
        ...defaultMeta,
        ...(payload.meta || {}),
      },
    };
  }

  /**
  * Sends a behavioral signal to the backend
  */
  sendSignal(signal) {
    if (network.type !== 'wifi') {
      return Promise.reject(new Error('Device is not connected to WiFi'));
    }

    const payload = this.attachMetadata(signal);
    logger.debug('sendSignal', payload);

    return this.send('/collect', payload);
  }

  async send(path, payload) {
    return post(`${this.backendUrl}${path}`, payload);
  }
}
