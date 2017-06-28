import md5 from '../core/helpers/md5';
import { utils } from '../core/cliqz';

import logger from './logger';


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
 *
 */

const GID_BACKEND_URL = 'https://anolysis-gid.cliqz.com';
const TELEMETRY_BACKEND_URL = 'https://anolysis-telemetry.cliqz.com/collect';


function sendDemographics(demographics, endpoint) {
  logger.log(`${endpoint} ${demographics}`);
  return post(`${GID_BACKEND_URL}/${endpoint}`, { id: demographics })
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
function newInstall(demographics) {
  return sendDemographics(demographics, 'new_install');
}


/**
 * Send a reappearing_user signal to the backend, with granular demographics.
 */
function reappearingUser(demographics) {
  return sendDemographics(demographics, 'reappearing_user');
}

/**
 * Once during each month (except during the same month as the new_install),
 * sends the granular demographic factors again to the backend.
 */
function activeUserSignal(demographics) {
  return sendDemographics(demographics, 'active_user');
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
function updateGID(demographics) {
  logger.log(`updateDemographics ${demographics}`);
  const hash = md5(demographics);

  // TODO: What is the right size?
  const prefix = hash.slice(0, 3);

  // Send a prefix of the hash to the backend
  return post(`${GID_BACKEND_URL}/update_gid`, { hash_prefix: prefix })
    .then((data) => {
      logger.log(`updateGID response ${JSON.stringify(data)}`);
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
function sendSignal(signal) {
  logger.log(`sendSignal ${JSON.stringify(signal)}`);
  return post(TELEMETRY_BACKEND_URL, signal);
}


export default {
  newInstall,
  reappearingUser,
  activeUserSignal,
  updateGID,
  sendSignal,
};
