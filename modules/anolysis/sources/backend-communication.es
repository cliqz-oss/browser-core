import log from 'anolysis/logging';
import md5 from 'core/helpers/md5';
import { fetch, Request } from 'core/http';


function post(url, payload) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const request = new Request(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload) });
  return fetch(request);
}

/**
 * Takes care of the communications with the backend
 *
 */

const GID_BACKEND_URL = 'https://anolysis-gid.cliqz.com';
const TELEMETRY_BACKEND_URL = 'https://anolysis-telemetry.cliqz.com/collect';


function sendDemographics(demographics, endpoint) {
  log(`${endpoint} ${demographics}`);
  return post(`${GID_BACKEND_URL}/${endpoint}`, { id: demographics })
    .then((response) => {
      if (response.ok) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
}

/**
 * Send a new_install signal to the backend, with granular demographics.
 */
function newInstall(demographics) {
  return sendDemographics(demographics, 'new_install');
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
  log(`updateDemographics ${JSON.stringify(demographics)}`);
  const hash = md5(demographics);

  // TODO: What is the right size?
  const prefix = hash.slice(0, 3);

  // Send a prefix of the hash to the backend
  return post(`${GID_BACKEND_URL}/update_gid`, { hash_prefix: prefix })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return Promise.reject();
    })
    .then((data) => {
      log(`updateGID response ${JSON.stringify(data)}`);
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

      return Promise.reject();
    });
}


/**
 * Sends a behavioral signal to the backend
 */
function sendSignal(gid, signal) {
  log(`sendSignal ${gid} => ${JSON.stringify(signal)}`);
  return post(TELEMETRY_BACKEND_URL, signal);
}


export default {
  newInstall,
  activeUserSignal,
  updateGID,
  sendSignal,
};
