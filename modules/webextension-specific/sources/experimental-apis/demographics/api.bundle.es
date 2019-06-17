import * as labels from './labels';

/* global Components, Services, ExtensionAPI, FileUtils */

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');

const connections = new Map();

function openDBHome(dbNameArr) {
  const dbName = dbNameArr.join('');
  const filePath = FileUtils.getFile('Home', dbNameArr);
  const connection = Services.storage.openDatabase(filePath);
  connections.set(dbName, connection);
  return connection;
}


function close(databaseName) {
  if (!connections.has(databaseName)) {
    return;
  }
  const connection = connections.get(databaseName);
  connections.delete(databaseName);
  // according to docs we should not use close because we use async statements
  // see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/mozIStorageConnection#close()
  connection.asyncClose();
}


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

async function getTroubleShootInfo() {
  return {
    isHeadless: await labels.isHeadless(),
    machineID: await labels.getMachineID(),
    systemIntegrityStatus: await labels.getSystemIntegrityStatus(),
    isProfileDefault: await labels.isProfileDefault(),
    windowsManufacturer: await labels.getWindowsManufacturer(),
    windowsModel: await labels.getWindowsModel(),
    windowsSerialNumber: await labels.getWindowsSerialNumber(),
    isDocker: await labels.isDocker(),
    uuidLinux: await labels.uuidLinux(),
    fromCommandLine: await labels.fromCommandLine(),
    mitmEnabled: await labels.mitmEnabled(),
    troubleShootInfo: await labels.getTroubleShootInfo(),
  };
}

global.demographics = class extends ExtensionAPI {
  getAPI() {
    return {
      demographics: {
        getMacDistribution,
        getTroubleShootInfo,
      }
    };
  }
};
