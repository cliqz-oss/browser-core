/*
 This module is used for sending the events for purpose of
 human-web, anti-tracking via a secure channel.
*/

import Storage from '../platform/hpn/storage';
import CliqzUtils from '../core/utils';
import config from '../core/config';
import ResourceLoader from '../core/resource-loader';
import { sendM } from './send-message';
import * as hpnUtils from './utils';
import { overRideCliqzResults } from './http-handler-patch';
import ProxyFilter from './proxy-filter';
import CryptoWorker from './crypto-worker';

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
  tmult: 4,
  tpace: 250,
  SOURCE_MAP_PROVIDER: config.settings.ENDPOINT_SOURCE_MAP_PROVIDER,
  LOOKUP_TABLE_PROVIDER: config.settings.ENDPOINT_LOOKUP_TABLE_PROVIDER,
  KEYS_PROVIDER: config.settings.ENDPOINT_KEYS_PROVIDER,
  proxyList: null,
  proxyListLoader: null,
  proxyStats: {},
  PROXY_LIST_PROVIDER: config.settings.ENDPOINT_PROXY_LIST_PROVIDER,
  BLIND_SIGNER: config.settings.ENDPOINT_BLIND_SIGNER,
  USER_REG: config.settings.ENDPOINT_USER_REG,
  localTemporalUniq: null,
  wCrypto: null,
  queriesID: {},
  servicesToProxy : ["api.cliqz.com", "antiphishing.cliqz.com"],
  proxyInfoObj: {},
  queryProxyFilter: null,
  pacemaker: function () {
    CliqzSecureMessage.counter += 1;

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

    if ((CliqzSecureMessage.counter / CliqzSecureMessage.tmult) % (60 * 15 * 1) === 0) {
      if (CliqzSecureMessage.debug) {
        CliqzUtils.log('Clean local temp queue', CliqzSecureMessage.LOG_KEY);
      }
      hpnUtils.prunelocalTemporalUniq();
    }
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
  eacemakerId: null,
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
      CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(CliqzSecureMessage.pacemaker.bind(this), CliqzSecureMessage.tpace, null);
    }

    // TODO: do not pass this to storage
    this.storage = new Storage(this);

    if (!CliqzSecureMessage.localTemporalUniq) this.storage.loadLocalCheckTable();

    // Load source map. Update it once an hour.
    this.sourceMapLoader = new ResourceLoader(
        ["hpn","sourcemap.json"],
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
        ["hpn","proxylist.json"],
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
        ["hpn","routeTable.json"],
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

    CliqzSecureMessage.dsPK.pubKeyB64 = config.settings.KEY_DS_PUBKEY;
    CliqzSecureMessage.secureLogger.publicKeyB64 = config.settings.KEY_SECURE_LOGGER_PUBKEY;

    if (CliqzUtils.getPref('proxyNetwork', true)) {
      overRideCliqzResults();
    }
    // Check user-key present or not.
    CliqzSecureMessage.registerUser();

    // Register proxy fr query.

    CliqzSecureMessage.queryProxyFilter = new ProxyFilter();
    CliqzSecureMessage.queryProxyFilter.init();
  },
  unload: function() {
    CliqzSecureMessage.queryProxyFilter.unload();
    this.storage.saveLocalCheckTable();
    CliqzSecureMessage.pushTelemetry();
    this.sourceMapLoader.stop();
    this.proxyListLoader.stop();
    this.routeTableLoader.stop();
    CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
    this.storage.close();
  },
  proxyIP: function () {
    if (!CliqzSecureMessage.proxyList) return;

    if (proxyCounter >= CliqzSecureMessage.proxyList.length) proxyCounter = 0;
    const url = hpnUtils.createHttpUrl(CliqzSecureMessage.proxyList[proxyCounter]);
    CliqzSecureMessage.queryProxyIP = url;
    proxyCounter += 1;
    return url;
  },
  registerUser: function() {
    this.storage.loadKeys().then(userKey => {
      if (!userKey) {
        const userCrypto = new CryptoWorker();

        userCrypto.onmessage = (e) => {
            if (e.data.status) {
              const uK = {};
              uK.privateKey = e.data.privateKey;
              uK.publicKey = e.data.publicKey;
              uK.ts = Date.now();
              this.storage.saveKeys(uK).then( response => {
                if (response.status) {
                  CliqzSecureMessage.uPK.publicKeyB64 = response.data.publicKey;
                  CliqzSecureMessage.uPK.privateKey = response.data.privateKey;
                }
              });
            }
            userCrypto.terminate();
        }

        userCrypto.postMessage({
          type: 'user-key'
        });
      } else {
        CliqzSecureMessage.uPK.publicKeyB64 = userKey.publicKey;
        CliqzSecureMessage.uPK.privateKey = userKey.privateKey;
      }
    });
  },
};
export default CliqzSecureMessage;
