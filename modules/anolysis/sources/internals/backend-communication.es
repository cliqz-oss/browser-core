import network from '../../platform/network';
import { isBetaVersion } from '../../platform/platform';

import md5 from '../../core/helpers/md5';
import prefs from '../../core/prefs';
import { httpPost } from '../../core/http';
import { randomInt } from '../../core/crypto/random';

import logger from './logger';
import getSynchronizedDate, { DATE_FORMAT } from './synchronized-date';

import inject from '../../core/kord/inject';

const HPNV2_OFF = 0; // https only (i.e., send directly to the Anolyis backend)
const HPNV2_ONLY = 1; // only hpnv2, otherwise fail
const HPNV2_WITH_FALLBACK = 2; // hpnv2 if possible, otherwise https

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
    this.hpnv2 = inject.module('hpnv2');
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
      // We add a random seed to each message to allow deduplication from the
      // backend. This should not be a privacy concern, as each message will
      // include a different number.
      seed: randomInt(),

      // TODO: This is temporary! Should be removed before putting in
      // production. This will be there as long as we test both telemetry
      // systems side by side, to be able to compare results meaningfully.
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
   * This function is used whenever the granular demographics need to be
   * communicated to the backend again. This can happen on multiple occasions:
   * 1. On new install (the first time Anolysis is started)
   * 2. Whenever the demographics of a user change
   *
   * To make sure that clients can negotiate their group in the future, the
   * backend will always return a serialized version of the normalized
   * demographics to the client whenever the `/send_demographics` endpoint is
   * used.
   */
  async sendDemographics({
    demographics,
    previousDemographics,
    previousDemographicsSentDate,
  }) {
    const payload = this.attachMetadata({
      demographics,
      previous_demographics: previousDemographics,
      previous_demographics_sent_date: previousDemographicsSentDate,
    });
    logger.debug('sendDemographics', payload);

    // Extract id returned by the backend. This is important because both
    // the backend and the client must agree on a common format. This will
    // be used later to update the GID.
    const { id } = await this.send('/send_demographics', payload);
    if (id) {
      // NOTE: this section is commented out because it was too strict. When we
      // add a new demographics in the backend, it can happen that an extra
      // field is returned as part of `id`. With the following verifications,
      // this would be rejected and the client would be stuck in a loop of
      // sending the demographics again in the future. To prevent that, and
      // until a better solution is implemented, the checks are disabled.

      // Check that id contains the same values than the `demographics`
      // we sent, to prevent the backend from changing this. Which could
      // allow tracking.
      // const id = JSON.parse(result.id);
      // const original = JSON.parse(demographics);

      // const originalKeys = Object.keys(original);
      // const idKeys = Object.keys(id);

      // if (idKeys.length !== originalKeys.length) {
      //   return Promise.reject('Returned id contains different keys:'
      //     + ` sent ${demographics}, received ${result.id}`);
      // }

      // for (const key of idKeys) {
      //   if (original[key] !== id[key]) {
      //     return Promise.reject(`The value for key ${key} differs:`
      //       + `sent ${original[key]}, received ${id[key]}`);
      //   }
      // }
      return id;
    }

    return Promise.reject(new Error('No id returned by the backend.'));
  }

  /**
   * Request current group to the backend.
   *
   * To avoid having to send the granular demographics to the backend every time
   * we update our GID, we only send a prefix of the hash of the demographics
   * instead. If the prefix is small enough (3 or 4 characters), then a few
   * users will share this prefix, and the backend won't know which was the real
   * one.
   *
   * The backend will check what pairs { full_hash, GID } it has available, and
   * will return a list of all the pairs for which the prefix sent by the client
   * also matches the prefix of `full_prefix`.
   *
   * The client is then able to get its true GID by selecting the one attached
   * to its original hash.
   */
  updateGID(formattedNormalizedDemographics) {
    logger.log('updateDemographics', formattedNormalizedDemographics);
    const hash = md5(formattedNormalizedDemographics);
    const prefix = hash.slice(0, 3);

    // Send a prefix of the hash to the backend
    return this.send('/update_gid', { hash_prefix: prefix })
      .then((data) => {
        logger.log('updateGID response', data);
        if (data.candidates) {
          const candidates = data.candidates;
          let gid = null;

          // Check if our granular demographics are in the list of candidates
          candidates.forEach((candidate) => {
            if (candidate.hash === hash) {
              gid = candidate.gid;
            }
          });

          if (gid !== null) {
            return Promise.resolve(gid);
          }
        }

        return Promise.reject(new Error(`No valid GID found ${hash}`));
      });
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

  getHpnv2Mode() {
    const mode = prefs.get('anolysis.hpnv2-mode');
    if (mode === HPNV2_OFF || mode === HPNV2_ONLY || mode === HPNV2_WITH_FALLBACK) {
      return mode;
    }

    // The mode was not overwritten by the user. In that case,
    // always send directly if the staging backend was been configured.
    //
    // Otherwise, try hpnv2 but if there are errors, conservatively
    // fallback back to https to limit message loss (if there are no
    // problems, we can later switch to HPNV2_ONLY).
    return this.config.get('useStaging') ? HPNV2_OFF : HPNV2_WITH_FALLBACK;
  }

  async send(path, payload) {
    const sendOverHttps = () => post(`${this.backendUrl}${path}`, payload);

    const mode = this.getHpnv2Mode();
    if (mode === HPNV2_OFF) {
      return sendOverHttps();
    }

    if (!this.hpnv2.isEnabled()) {
      if (mode === HPNV2_WITH_FALLBACK) {
        logger.log('hpnv2 not available. Falling back to sending over https...');
        return sendOverHttps();
      }
      throw new Error('Failed to sent message, as hpnv2 is not available');
    }

    const action = `anolysis.${path.substr(1)}`;
    let response;
    try {
      response = await this.hpnv2.action('send', {
        action,
        payload
      });
    } catch (e) {
      if (mode === HPNV2_WITH_FALLBACK) {
        // TODO: Keep track of the error types that we see on the client
        logger.warn(`Failed to send message over hpnv2 (reason: ${e}). Falling back to https...`);
        return sendOverHttps();
      }
      logger.error(`Failed to send message to ${path}`, e);
      throw e;
    }
    return response.json();
  }
}
