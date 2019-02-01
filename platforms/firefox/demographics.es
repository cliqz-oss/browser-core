import { getPref, setPref } from './prefs';
import getWindow from './window-api';
import config from '../core/config';
import { openDBHome, close } from '../platform/sqlite';

const DEFAULT_DIST_VAL = 'web0003';

/* Schema of LSQuarantineEvent
 * LSQuarantineEventIdentifier TEXT PRIMARY KEY NOT NULL,
 * LSQuarantineTimeStamp REAL,
 * LSQuarantineAgentBundleIdentifier TEXT,
 * LSQuarantineAgentName TEXT,
 * LSQuarantineDataURLString TEXT,
 * LSQuarantineSenderName TEXT,
 * LSQuarantineSenderAddress TEXT,
 * LSQuarantineTypeNumber INTEGER,
 * LSQuarantineOriginTitle TEXT,
 * LSQuarantineOriginURLString TEXT,
 * LSQuarantineOriginAlias BLOB
 */

const dbPath = ['Library', 'Preferences', 'com.apple.LaunchServices.QuarantineEventsV2'];

function getParam(url, key) {
  if (url.indexOf('?') === -1 || url.indexOf(`${key}=`) === -1) {
    return null;
  }
  return url.split(`${key}=`)[1].split('&')[0];
}

async function getMacDistribution() {
  const connection = openDBHome(dbPath);
  const query = 'select LSQuarantineTimeStamp, LSQuarantineDataURLString, LSQuarantineOriginURLString, LSQuarantineAgentName'
    + ' from LSQuarantineEvent'
    + " where LSQuarantineDataURLString LIKE '%cdn.cliqz.com/%'"
    + ' ORDER BY LSQuarantineTimeStamp desc;';
  const stmt = connection.createAsyncStatement(query);
  const res = [];
  const exec = new Promise((resolve, reject) => {
    stmt.executeAsync({
      handleResult: (aResultSet) => {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          const agent = row.getResultByName('LSQuarantineAgentName');
          const url = row.getResultByName('LSQuarantineDataURLString');

          if (url.indexOf('.dmg') > -1 && url.indexOf('CLIQZ') > -1
            && agent.indexOf('Cliqz') === -1) {
            const distributionId = getParam(url, 'refId') || getParam(url, 'pk_campaign')
            || getParam(url, 'keyword');
            if (distributionId) {
              res.push(distributionId);
            }
          }
        }
      },
      handleError: (aError) => {
        close(dbPath.join(''));
        reject(aError);
      },
      handleCompletion: () => {
        resolve(res);
      }
    });
  });
  return exec.then((r) => {
    close(dbPath.join(''));
    return r[0];
  });
}

export async function getUserAgent() {
  return (await getWindow()).navigator.userAgent;
}

export async function getDistribution() {
  let distribution = getPref('full_distribution') || getPref('distribution', '');
  if (!distribution && config.settings.channel === '40'
    && (await getUserAgent()).indexOf('Mac OS') > -1) {
    distribution = await getMacDistribution() || DEFAULT_DIST_VAL;
    setPref('distribution', distribution);
  }
  return distribution;
}

export function getInstallDate() {
  return getPref('install_date', '');
}

export function getChannel() {
  return config.settings.channel;
}

export function getCountry() {
  return getPref('config_location.granular', '');
}
