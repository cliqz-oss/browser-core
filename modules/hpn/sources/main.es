'use strict';
/*
 This module is used for sending the events for purpose of
 human-web, anti-tracking via a secure channel.
*/

import { sendM } from 'hpn/send-message';
import * as hpnUtils from 'hpn/utils';
import { overRideCliqzResults } from 'hpn/http-handler-patch';
import ResourceLoader from 'core/resource-loader';
import CliqzUtils from 'core/utils';
import ProxyFilter from 'hpn/proxy-filter';

const { utils: Cu } = Components;


Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/FileUtils.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');


/* Global variables
*/
let proxyCounter = 0;

const CliqzSecureMessage = {
  VERSION: '0.1',
  LOG_KEY: 'securemessage',
  debug: false,
  counter: 0,
  secureLogger: {},
  uPK: {},
  dsPK: {},
  routeTable: null,
  routeTableLoader: null,
  RSAKey: '',
  eventID: {},
  sourceMap: null,
  sourceMapLoader: null,
  secureKeysLoader: null,
  tmult: 4,
  tpace: 250,
  SOURCE_MAP_PROVIDER: 'https://hpn-collector.cliqz.com/sourcemapjson?q=1',
  LOOKUP_TABLE_PROVIDER: 'https://hpn-collector.cliqz.com/lookuptable?q=1',
  KEYS_PROVIDER: 'https://hpn-collector.cliqz.com/signerKey?q=1',
  proxyList: null,
  proxyListLoader: null,
  proxyStats: {},
  PROXY_LIST_PROVIDER: 'https://hpn-collector.cliqz.com/proxyList?q=1',
  BLIND_SIGNER: 'https://hpn-sign.cliqz.com/sign',
  USER_REG: 'https://hpn-sign.cliqz.com/register',
  localTemporalUniq: null,
  wCrypto: null,
  queriesID: {},
  servicesToProxy : ["api.cliqz.com", "antiphishing.cliqz.com"],
  proxyInfoObj: {},
  queryProxyFilter: null,
  pacemaker: function () {
    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % 10 === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter / CliqzSecureMessage.tmult, CliqzSecureMessage.LOG_KEY);
      }
    }

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % 5 === 0) {
      const currentTime = Date.now();


      if (!CliqzUtils.getWindow() || !CliqzUtils.getWindow().CLIQZ || !CliqzUtils.getWindow().CLIQZ.UI) return;
      const tDiff = currentTime - CliqzUtils.getWindow().CLIQZ.UI.lastInputTime;

      if (tDiff > 0 && tDiff > (1000 * 2 * 1)) {
        CliqzSecureMessage.proxyIP();
      }

      if ((!CliqzSecureMessage.uPK.publicKeyB64) || (!CliqzSecureMessage.uPK.privateKey)) {
        CliqzSecureMessage.registerUser();
      }
    }

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % (60 * 3 * 1) === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('Load proxy list', CliqzSecureMessage.LOG_KEY);
      }
      hpnUtils.prunelocalTemporalUniq();
    }


    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % (60 * 10 * 1) === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('Save local temporalUniquness stats', CliqzSecureMessage.LOG_KEY);
      }
      hpnUtils.saveLocalCheckTable();
    }

    CliqzSecureMessage.counter += 1;
  },
  // ****************************
  // telemetry, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
  // ****************************
  trk: [],
  trkTimer: null,
  telemetry: function(msg, instantPush) {
    if (!CliqzSecureMessage || // might be called after the module gets unloaded
        CliqzUtils.getPref('dnt', false) ||
        CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

    if (msg) CliqzSecureMessage.trk.push(msg);
    CliqzUtils.clearTimeout(CliqzSecureMessage.trkTimer);
    if (instantPush || CliqzSecureMessage.trk.length % 20 === 0) {
      CliqzSecureMessage.pushTelemetry();
    } else {
      CliqzSecureMessage.trkTimer = CliqzUtils.setTimeout(CliqzSecureMessage.pushTelemetry, 10000);
    }
  },
  _telemetry_req: null,
  _telemetry_sending: [],
  telemetry_MAX_SIZE: 500,
  previousDataPost: null,
  pushMessage : [],
  routeHashTable: null,
  pacemakerId: null,
  queryProxyIP: null,
  performance: null,
  pushTelemetry: function() {
    CliqzSecureMessage._telemetry_sending = CliqzSecureMessage.trk.splice(0);
    CliqzSecureMessage.pushMessage = hpnUtils.trkGen(CliqzSecureMessage._telemetry_sending);
    const nextMsg = CliqzSecureMessage.nextMessage();
    if (nextMsg) {
      return sendM(nextMsg);
    }
    return Promise.resolve([]);
  },
  nextMessage: function() {
    if (CliqzSecureMessage._telemetry_sending.length > 0) {
      return CliqzSecureMessage._telemetry_sending[CliqzSecureMessage.pushMessage.next().value];
    }
  },
  initAtWindow: function(window) {
  },
  init: function() {
    // Doing it here, because this lib. uses navigator and window objects.
    // Better method appriciated.

    if (CliqzSecureMessage.pacemakerId == null) {
      CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
    }
    if (!CliqzSecureMessage.dbConn) CliqzSecureMessage.initDB();

    if (!CliqzSecureMessage.localTemporalUniq) hpnUtils.loadLocalCheckTable();

    // Load source map. Update it once an hour.
    this.sourceMapLoader = new ResourceLoader(
        ["hpn","sourcemap"],
        {
          remoteURL: CliqzSecureMessage.SOURCE_MAP_PROVIDER
        }
    );

    this.sourceMapLoader.load().then( e => {
      CliqzSecureMessage.sourceMap = e;
    })

    this.sourceMapLoader.onUpdate(e => CliqzSecureMessage.sourceMap = e);

    // Load proxy list. Update every 5 minutes.
    this.proxyListLoader = new ResourceLoader(
        ["hpn","proxylist"],
        {
          remoteURL: CliqzSecureMessage.PROXY_LIST_PROVIDER,
          cron: 1 * 5 * 60 * 1000,
          updateInterval: 1 * 5 * 60 * 1000,
        }
    );

    this.proxyListLoader.load().then( e => {
      CliqzSecureMessage.proxyList = e;
    })

    this.proxyListLoader.onUpdate(e => CliqzSecureMessage.proxyList = e);

    // Load lookuptable. Update every 5 minutes.
    this.routeTableLoader = new ResourceLoader(
        ["hpn","routeTable"],
        {
          remoteURL: CliqzSecureMessage.LOOKUP_TABLE_PROVIDER,
          cron: 1 * 5 * 60 * 1000,
          updateInterval: 1 * 5 * 60 * 1000,
        }
    );

    this.routeTableLoader.load().then( e => {
      CliqzSecureMessage.routeTable = e;
    })

    this.routeTableLoader.onUpdate(e => CliqzSecureMessage.routeTable = e);

    // Load secure keys. Update every one hour.
    this.secureKeysLoader = new ResourceLoader(
        ["hpn","securekeys"],
        {
          remoteURL: CliqzSecureMessage.KEYS_PROVIDER
        }
    );

    this.secureKeysLoader.load().then( e => {
      CliqzSecureMessage.dsPK.pubKeyB64 = e.signerB64;
      CliqzSecureMessage.secureLogger.publicKeyB64 = e.secureloggerB64;
    })

    this.secureKeysLoader.onUpdate(e => {
      CliqzSecureMessage.dsPK.pubKeyB64 = e.signerB64;
      CliqzSecureMessage.secureLogger.publicKeyB64 = e.secureloggerB64;
    });

    if (CliqzUtils.getPref('proxyNetwork', true)) {
      overRideCliqzResults();
    }
    // Check user-key present or not.
    CliqzSecureMessage.registerUser();

    // Register proxy fr query.

    CliqzSecureMessage.queryProxyFilter = new ProxyFilter();
  },
  initDB: function() {
    if (FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']).exists()) {
      if (CliqzSecureMessage.dbConn == null) {
        CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']));
      }
      hpnUtils.createTable();
      return;
    }
    else {
      CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile('ProfD', ['cliqz.dbhumanweb']));
      hpnUtils.createTable();
    }
  },
  unload: function() {
    CliqzSecureMessage.queryProxyFilter.destroy();
    hpnUtils.saveLocalCheckTable();
    CliqzSecureMessage.pushTelemetry();
    this.sourceMapLoader.stop();
    this.proxyListLoader.stop();
    this.routeTableLoader.stop();
    this.secureKeysLoader.stop();
    CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
  },
  dbConn: null,
  proxyIP: function () {
    if (!CliqzSecureMessage.proxyList) return;

    if (proxyCounter >= CliqzSecureMessage.proxyList.length) proxyCounter = 0;
    const url = hpnUtils.createHttpUrl(CliqzSecureMessage.proxyList[proxyCounter]);
    CliqzSecureMessage.queryProxyIP = url;
    proxyCounter += 1;
  },
  registerUser: function() {
    hpnUtils.loadKeys().then(userKey => {
      if (!userKey) {
        const userCrypto = new Worker('crypto-worker.js');
        userCrypto.postMessage({
          type: 'user-key'
        });

        userCrypto.onmessage = function msgRecieved(e) {
            if (e.data.status) {
              const uK = {};
              uK.privateKey = e.data.privateKey;
              uK.publicKey = e.data.publicKey;
              uK.ts = Date.now();
              hpnUtils.saveKeys(uK).then( response => {
                if (response.status) {
                  CliqzSecureMessage.uPK.publicKeyB64 = response.data.publicKey;
                  CliqzSecureMessage.uPK.privateKey = response.data.privateKey;
                }
              });
            }
            userCrypto.terminate();
        }
      }
      else {
        CliqzSecureMessage.uPK.publicKeyB64 = userKey.publicKey;
        CliqzSecureMessage.uPK.privateKey = userKey.privateKey;
      }
    });
  },
};
export default CliqzSecureMessage;
