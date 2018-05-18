import network from '../../platform/network';

import md5 from '../../core/helpers/md5';
import utils from '../../core/utils';

import logger from './logger';
import { isTelemetryEnabled } from './enabling';


function post(url, payload) {
  return new Promise((resolve, reject) => {
    utils.httpPost(
      url,
      (req) => {
        try {
          const json = JSON.parse(req.response);
          resolve(json);
        } catch (ex) {
          reject(`Backend ${url} could not parse JSON: ${req.response}`);
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
    this.backendUrl = config.get('backend.url');
  }

  sendDemographics(demographics, endpoint) {
    logger.debug(endpoint, demographics);
    return post(`${this.backendUrl}/${endpoint}`, { id: demographics })
      .then((result) => {
        // Extract id returned by the backend. This is important because both
        // the backend and the client must agree on a common format. This will
        // be used later to update the GID.
        if (result.id) {
          // Check that id contains the same values than the `demographics`
          // we sent, to prevent the backend from changing this. Which could
          // allow tracking.
          const id = JSON.parse(result.id);
          const original = JSON.parse(demographics);

          const idKeys = Object.keys(id);
          const originalKeys = Object.keys(original);

          if (idKeys.length !== originalKeys.length) {
            return Promise.reject('Returned id contains different keys:'
              + ` sent ${demographics}, received ${result.id}`);
          }

          for (const key of originalKeys) {
            if (original[key] !== id[key]) {
              return Promise.reject(`The value for key ${key} differs:`
                + `sent ${original[key]}, received ${id[key]}`);
            }
          }

          return result.id;
        }

        return Promise.reject('No id returned by the backend.');
      });
  }

  /**
  * Send a new_install signal to the backend, with granular demographics.
  */
  newInstall(demographics) {
    return this.sendDemographics(demographics, 'new_install');
  }

  /**
  * Send a reappearing_user signal to the backend, with granular demographics.
  */
  reappearingUser(demographics) {
    return this.sendDemographics(demographics, 'reappearing_user');
  }

  /**
  * Once during each month (except during the same month as the new_install),
  * sends the granular demographic factors again to the backend.
  */
  activeUserSignal(demographics) {
    return this.sendDemographics(demographics, 'active_user');
  }

  /**
  * Signal a demographics update of the client to the backend.
  *
  * To avoid having to send the granular demographics to the backend
  * every time we update our GID, we only send a prefix of the hash of
  * the demographics instead. If the prefix is small enough (3 or 4
  * characters), then a few users will share this prefix, and the
  * backend won't know which was the real one.
  *
  * The backend will check what pairs { full_hash, GID } it has
  * available, and will return a list of all the pairs for which
  * the prefix sent by the client also matches the prefix of `full_prefix`.
  *
  * The client is then able to get its true GID by selecting the one
  * attached to its original hash.
  *
  * Right now it should naver happen that a client does not find its
  * GID using this method, because every month every clients will send
  * again their granular combination. This is not satisfactory and
  * another method, with better privacy preservation, will be implemented
  * in the future.
  */
  updateGID(demographics) {
    logger.log('updateDemographics', demographics);
    const hash = md5(demographics);

    // NOTE: prefix of size 4
    // '1': 178182,
    // '2': 210984,
    // '3': 131292,
    // '4': 56398,
    // '5': 23377,
    // '6': 3319,
    // '7': 647,
    // '8': 24})

    // NOTE: prefix of size 3
    // '4': 2,
    // '5': 8,
    // '6': 58,
    // '7': 146,
    // '8': 527,
    // '9': 1200})
    // '10': 2437,
    // '11': 4562,
    // '12': 7531,
    // '13': 12556,
    // '14': 17584,
    // '15': 25351,
    // '16': 36664,
    // '17': 44523,
    // '18': 54860,
    // '19': 48917,
    // '20': 47010,
    // '21': 50756,
    // '22': 52401,
    // '23': 40243,
    // '24': 40067,
    // '25': 39202,
    // '26': 22787,
    // '27': 15901,
    // '28': 13372,
    // '29': 9243,
    // '30': 6237,
    // '31': 4483,
    // '32': 2729,
    // '33': 475,
    // '34': 1664,
    // '35': 251,
    // '36': 476,
    const prefix = hash.slice(0, 3);

    // Send a prefix of the hash to the backend
    return post(`${this.backendUrl}/update_gid`, { hash_prefix: prefix })
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

        return Promise.reject(`No valid GID found ${hash}`);
      });
  }

  /**
  * Sends a behavioral signal to the backend
  */
  sendSignal(signal) {
    logger.debug('sendSignal', signal);

    if (network.type !== 'wifi') {
      return Promise.reject('Device is not connected to WiFi');
    }

    if (!isTelemetryEnabled()) {
      return Promise.reject('Telemetry is disabled');
    }

    return post(`${this.backendUrl}/collect`, signal);
  }
}
