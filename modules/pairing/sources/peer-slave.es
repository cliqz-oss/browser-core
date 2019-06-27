import { fromByteArray, sha256, encryptStringAES, decryptStringAES, toByteArray, deriveAESKey, randomBytes, generateRSAKeypair } from '../core/crypto/utils';
import console from '../core/console';
import { encryptPairedMessage, decryptPairedMessage, ERRORS, VERSION } from './shared';
import CliqzPeer from '../p2p/cliqz-peer';
import { fromBase64 } from '../core/encoding';
import inject from '../core/kord/inject';
import { setTimeout } from '../core/timers';
import pacemaker from '../core/services/pacemaker';
import { getDeviceName } from '../platform/device-info';

// This class has the responsibility of handling the desktop-mobile pairing
// (from the desktop side).
// Provides the infrastructure for pairing, unpairing, sending messages to other
// devices, receiving messages and dispatching them, etc.

export default class CliqzPairing {
  static get STATUS_UNPAIRED() {
    return 0;
  }

  static get STATUS_PAIRED() {
    return 1;
  }

  static get STATUS_PAIRING() {
    return 2;
  }

  waitInit() {
    if (this.isInit) {
      return Promise.resolve();
    }
    if (this.isUnloaded) {
      return Promise.reject();
    }
    return this.initPromise;
  }

  generateKeypair() {
    return Promise.resolve()
      // TODO: remove generateRSAKeypair when sure that mobile (peer-master) version will be >= 2
      .then(() => (this.keypair || generateRSAKeypair()))
      .then((keypair) => {
        this.keypair = keypair;
        this.secret = this.keypair[0];
        return sha256(this.secret);
      })
      .then((deviceID) => {
        this.deviceID = deviceID;
      });
  }

  stopPairing() {
    if (this.status !== CliqzPairing.STATUS_PAIRING) {
      throw new Error('Cannot stop pairing if not pairing');
    }
    if (!this.pairingToken) {
      this.cancelPairing = true;
    } else {
      this.setUnpaired();
    }
  }

  get deviceID() {
    return this.data.get('deviceID');
  }

  set deviceID(id) {
    this.data.set('deviceID', id);
  }

  unpair() {
    if (this.status !== CliqzPairing.STATUS_PAIRED) {
      throw new Error('Cannot unpair if status is not paired');
    }
    const promise = new Promise((resolve, reject) => {
      setTimeout(reject, 1000);
      this.sendMessage({}, 'remove_peer', [this.masterID])
        .then(resolve)
        .catch(reject);
    });
    return promise
      .catch(e => this.log(e, 'ERROR unpairing'))
      .then(() => this.setUnpaired());
  }

  startPairing(slaveName = getDeviceName()) {
    if (this.status !== CliqzPairing.STATUS_UNPAIRED) {
      if (this.status === CliqzPairing.STATUS_PAIRING) {
        this.pairingRemaining = this.pairingTimeout;
      }
      // this is encountered while waiting for connection.
      return Promise.reject();
    }

    return this.setPairing(slaveName);
  }

  // private
  sendMessage(msg, type, targets) {
    if (this.status !== CliqzPairing.STATUS_PAIRED) {
      throw new Error('Only can send messages if PeerComm status is paired');
    }
    return this.sendPaired({ msg, type, source: this.deviceID }, targets);
  }

  checkMasterConnection() {
    if (this.status === CliqzPairing.STATUS_PAIRED) {
      return this.peer.checkPeerConnection(this.masterID);
    }
    return Promise.reject();
  }

  get pairingInfo() {
    if (!this.isInit) {
      return {
        isInit: false,
      };
    }
    return {
      isPaired: this.isPaired,
      isPairing: this.isPairing,
      isUnpaired: this.isUnpaired,
      masterName: this.masterName,
      deviceName: this.deviceName,
      isMasterConnected: this.isMasterConnected,
      pairingToken: this.pairingToken,
      isInit: true,
    };
  }

  get isMasterConnected() {
    return this.isPaired && !!this.peer && !!this.peer._getConnection(this.masterID);
  }

  get isPaired() {
    return this.status === CliqzPairing.STATUS_PAIRED;
  }

  get isPairing() {
    return this.status === CliqzPairing.STATUS_PAIRING;
  }

  get isUnpaired() {
    return this.status === CliqzPairing.STATUS_UNPAIRED;
  }

  // Private ----
  get masterID() {
    return this.data.get('masterID');
  }

  set masterID(x) {
    this.data.set('masterID', x);
  }

  get aesKey() {
    return this.data.get('aesKey');
  }

  set aesKey(x) {
    this.data.set('aesKey', x);
  }

  get deviceName() {
    if (this.isPaired) {
      return this.devices.find(x => x.id === this.deviceID).name;
    }
    return null;
  }

  get devices() {
    return this.data.get('devices');
  }

  set devices(x) {
    this.data.set('devices', x);
  }

  get keypair() {
    return this.data.get('keypair');
  }

  set keypair(x) {
    this.data.set('keypair', x);
  }

  get secret() {
    return this.data.get('secret');
  }

  set secret(x) {
    this.data.set('secret', x);
  }

  get publicKey() {
    return this.keypair[0];
  }

  get privateKey() {
    return this.keypair[1];
  }

  get masterName() {
    if (this.isPaired) {
      return this.devices.find(x => x.id === this.masterID).name;
    }
    return null;
  }

  get randomToken() {
    return this.data.get('randomToken');
  }

  set randomToken(x) {
    this.data.set('randomToken', x);
  }

  findDevice(deviceID) {
    return this.devices.find(x => x.id === deviceID);
  }

  static sendEncrypted(message, aesKey) {
    return encryptStringAES(JSON.stringify(message), aesKey);
  }

  sendPaired(message, t) {
    const devices = this.devices.filter(x => t.indexOf(x.id) !== -1);
    const onlyCompress = devices.every(x => x.version >= 2);
    return this.checkMasterConnection() // TODO: we shouldn't do this for all messages, traffic!
      .then(() => encryptPairedMessage(message, devices, onlyCompress))
      .then(encrypted => this.peer.send(this.masterID, encrypted));
  }

  static receiveEncrypted(data, aesKey) {
    return decryptStringAES(data, aesKey)
      .then(message => JSON.parse(message));
  }

  loadPairingAESKey() {
    if (this.pairingAESKey) {
      return Promise.resolve(this.pairingAESKey);
    }
    if (this.randomToken) {
      const token = toByteArray(this.randomToken, 'b64');
      return deriveAESKey(token)
        .then((key) => {
          this.pairingAESKey = key;
          return key;
        });
    }
    return Promise.reject(new Error('randomToken is null'));
  }

  onPairingMessage(data, label, peerID) {
    if (CliqzPeer.isPeerAuthenticated(peerID)) {
      this.loadPairingAESKey()
        .then(pairingAESKey => CliqzPairing.receiveEncrypted(data, pairingAESKey))
        .then((decrypted) => {
          try {
            if (decrypted.type === 'error') {
              this.onerror(decrypted.code);
              this.pairingMaster = peerID;
            } else {
              const { devices } = decrypted;
              this.setPaired(peerID, devices);
            }
          } catch (e) {
            this.log('Error in pairing 1 ', e);
          }
        })
        .catch((e) => {
          this.log('Error in pairing 2 ', e);
        });
    } else {
      this.log('ERROR: Peer is not authenticated');
    }
  }

  onPairedMessage(data, label, peerID) {
    if (peerID === this.masterID) {
      const decMsg = d => decryptPairedMessage(d, this.deviceID, this.privateKey);
      const receiveMessage = (({ msg, type, source }) => {
        try {
          this.receiveMessage(msg, type, source);
        } catch (e) {
          this.logError('Error receiving message', e);
        }
      });
      const errorDecrypting = (e) => {
        this.logError('Error receiving encrypted message, unpairing...', e);
        this.setUnpaired();
        this.onerror(ERRORS.PAIRED_DECRYPTION_ERROR);
      };
      if (Array.isArray(data)) {
        // This might cause out of order msgs (single msgs that are faster to decrypt)
        Promise.all(data.map(fromBase64).map(decMsg))
          .catch((e) => {
            errorDecrypting(e);
            throw e;
          })
          .then(msgs => msgs.forEach(receiveMessage));
      } else {
        decMsg(data)
          .catch((e) => {
            errorDecrypting(e);
            throw e;
          })
          .then(receiveMessage);
      }
    }
  }

  receiveMessage(msg, type, source) {
    if (type === '__NEWPEER') {
      this.log('New peer!!');
      this.addPeer(msg);
    } else if (type === '__REMOVEDPEER') {
      if (source === this.deviceID) {
        this.log('Unpaired from master!!');
        this.setUnpaired();
      } else {
        this.log('Removed peer!!');
        this.removePeer(source);
      }
    } else if (type === '__NEWARN') {
      // noop
    } else if (this.onmessage) {
      this.onmessage(msg, source, type);
    }
  }

  addPeer(peer) {
    const idx = this.devices.findIndex(x => x.id === peer.id);
    if (idx >= 0) {
      this.devices.splice(idx, 1);
    }
    this.devices.push(peer);
    this.data.set('devices', this.devices);
    if (peer.id === this.deviceID) {
      this.lastVersion = peer.version;
    }
    if (this.ondeviceadded) {
      this.ondeviceadded(peer);
    }
  }

  removePeer(id) {
    const idx = this.devices.findIndex(x => x.id === id);
    if (idx >= 0) {
      const rem = this.devices[idx];
      this.devices.splice(idx, 1);
      this.data.set('devices', this.devices);
      if (this.ondeviceremoved) {
        this.ondeviceremoved(rem);
      }
    }
  }

  setPaired(masterID, devices, noTrigger) {
    if (this.destroyed) {
      return;
    }

    this.status = CliqzPairing.STATUS_PAIRED;
    this.masterID = masterID;
    this.devices = devices;
    this.pairingMaster = null;
    this.pairingToken = null;
    if (this.pairingTimer) {
      this.pairingTimer.stop();
      this.pairingTimer = null;
    }
    this.pairingName = null;
    this.cancelPairing = false;
    this.peer.open();
    this.peer.addTrustedPeer(masterID);

    const me = devices.find(x => x.id === this.deviceID);
    this.lastVersion = me.version;

    this.peer.onconnect = (peerID) => {
      if (peerID === this.masterID && this.onmasterconnected) {
        if (this.masterVersion >= 1 && this.version !== this.lastVersion) {
          this.sendMessage(this.version, '__VERSION', [this.masterID]).catch(() => {});
        }
        this.onmasterconnected();
      }
    };
    this.peer.ondisconnect = (peerID) => {
      if (peerID === this.masterID && this.onmasterdisconnected) {
        this.onmasterdisconnected();
      }
    };
    this.peer.onmessage = this.onPairedMessage.bind(this);
    if (this.onpaired && !noTrigger) {
      this.onpaired(masterID, devices);
    }
  }

  setUnpaired(noTrigger) {
    if (this.destroyed) {
      return;
    }
    this.status = CliqzPairing.STATUS_UNPAIRED;
    this.peer.close();
    this.pairingAESKey = null;
    this.pairingToken = null;
    this.aesKey = null;
    this.masterID = null;
    this.devices = [];
    if (this.pairingTimer) {
      this.pairingTimer.stop();
      this.pairingTimer = null;
    }
    this.pairingName = null;
    this.pairingMaster = null;
    this.randomToken = null;
    this.cancelPairing = false;
    if (this.onunpaired && !noTrigger) {
      this.onunpaired();
    }
  }

  get lastVersion() {
    return this.data.get('lastVersion');
  }

  set lastVersion(version) {
    this.data.set('lastVersion', version);
  }

  get version() {
    return VERSION;
  }

  generatePairingKey() {
    const token = randomBytes(15);
    this.randomToken = fromByteArray(token, 'b64');
    return this.loadPairingAESKey();
  }

  sendPairingMessage(masterID) {
    return this.loadPairingAESKey()
      .then(pairingAESKey =>
        CliqzPairing.sendEncrypted(
          [this.publicKey, this.pairingName, this.version],
          pairingAESKey,
        ))
      .then(encrypted => this.peer.send(masterID, encrypted));
  }

  retryPairingName(deviceName) {
    if (this.isPairing) {
      this.pairingName = deviceName;
      if (this.pairingMaster) {
        this.sendPairingMessage(this.pairingMaster);
      }
    }
  }

  setPairing(slaveName) {
    if (this.destroyed) {
      return Promise.reject();
    }
    this.status = CliqzPairing.STATUS_PAIRING;
    this.pairingRemaining = this.pairingTimeout;
    this.pairingName = slaveName;
    this.pairingTimer = pacemaker.everySecond(() => {
      this.pairingRemaining -= 1;
      if (this.pairingRemaining <= 0) {
        if (this.isPairing) {
          this.stopPairing();
        }
      }
      if (this.onpairingtick) {
        this.onpairingtick(this.pairingRemaining);
      }
    });
    this.peer.open();
    this.peer.onconnect = peerID => this.sendPairingMessage(peerID);
    this.peer.ondisconnect = null;
    this.peer.clearPeerWhitelist();
    this.peer.onmessage = this.onPairingMessage.bind(this);

    return Promise.all([this.generatePairingKey(), this.peer.createConnection()])
      .then(() => {
        const b64 = fromByteArray(toByteArray(this.peer.peerID, 'hex'), 'b64');
        this.pairingToken = [b64, this.randomToken].join(':');
        if (this.onpairing) {
          this.onpairing(this.pairingToken);
        }
        if (this.cancelPairing) {
          this.setUnpaired();
        }
        return this.pairingInfo;
      })
      .catch((e) => {
        // TODO: Errors here should be handled properly, server might be down, etc -> notifications
        // TODO: emit error
        this.log('Error in startPairing ', e);
        this.setUnpaired();
      });
  }

  initPeer() {
    return this.p2p.action('createPeer',
      [this.secret, ''],
      {
        DEBUG: this.debug,
        ordered: true,
        maxMessageRetries: 0,
        signalingEnabled: false,
      })
      .then((peer) => {
        this.peer = peer;
        this.peer.setMessageSizeLimit(this.maxMsgSize);
        this.peer.encryptSignaling = data =>
          this.loadPairingAESKey()
            .then(aesKey => CliqzPairing.sendEncrypted(data, aesKey))
            .catch(() => data);

        this.peer.decryptSignaling = data =>
          this.loadPairingAESKey()
            .then(aesKey => CliqzPairing.receiveEncrypted(data, aesKey))
            .catch(() => data);
      });
  }

  constructor(debug = false) {
    this.p2p = inject.module('p2p');
    this.maxMsgSize = 5 * 1024 * 1024;
    this.debug = debug;
    this.isInit = false;
    this.apps = new Map();
    this.initPromise = new Promise((resolve, reject) => {
      this.resolveInit = resolve;
      this.rejectInit = reject;
    });
    if (debug) {
      this.log = (...args) => console.log(...args);
    } else {
      this.log = () => {};
    }
    this.logError = console.error.bind(console);
  }

  addObserver(channel, app) {
    this.apps.set(channel, app);
    if (app.oninit && this.isInit) {
      app.oninit(...this.getOnInitArgs(channel));
    }
  }

  getObserver(channel) {
    return this.apps.get(channel);
  }

  removeObserver(channel, app) {
    if (this.apps.get(channel) === app) {
      this.apps.delete(channel);
    }
  }

  // Private -----
  propagateEvent(eventName, args) {
    this.apps.forEach((x) => {
      if (x[eventName]) {
        x[eventName](...args);
      }
    });
  }

  installEvent(eventName) {
    this[eventName] = (...args) => {
      this.propagateEvent(eventName, args);
    };
  }

  init(storage) {
    this.pairingTimeout = 60; // seconds
    this.data = storage;

    this.onpairing = null;
    this.onpaired = null;
    this.onunpaired = null;
    this.onmessage = null;
    this.onerror = null;
    this.ondeviceadded = null;
    this.ondeviceremoved = null;
    this.onmasterconnected = null;
    this.onmasterdisconnected = null;

    return this.generateKeypair()
      .then(() => !this.isUnloaded && this.initPeer())
      .then(() => {
        if (this.isUnloaded) {
          return;
        }
        if (this.masterID) {
          this.setPaired(this.masterID, this.devices, true);
          this.checkMasterConnection().catch(() => {});
        } else {
          this.setUnpaired(true);
        }

        // These events will be directly propagated to all the apps
        const events = [
          'onpairing',
          'onpaired',
          'onunpaired',
          'onerror',
          'ondeviceadded',
          'ondeviceremoved',
          'onmasterconnected',
          'onmasterdisconnected',
          'onpairingtick',
        ];
        events.forEach(e => this.installEvent(e));
        this.onmessage = (msg, source, type) => {
          const app = this.apps.get(type);
          if (app && app.onmessage) {
            app.onmessage(msg, source, type);
          }
        };
        this.apps.forEach((app, channel) => {
          if (app.oninit) {
            app.oninit(...this.getOnInitArgs(channel));
          }
        });
        this.resolveInit();
        this.isInit = true;
      })
      .catch((e) => {
        this.log('Error: ', e, 'PeerSlave.init');
        this.rejectInit(e);
      });
  }

  send(msg, channel, targets) {
    let t = targets;
    if (!t) {
      return Promise.resolve();
    }
    t = Array.isArray(t) ? t : [t];
    return this.sendMessage(msg, channel, t);
  }

  getOnInitArgs(channel) {
    const self = this;
    // This is the object each app will receive on init, and will be its interface to the
    // peer comm module. The app code itself has no dependency on us, but someone will need to
    // create the app and call CliqzPeerComm.addObserver(channel, app)
    // TODO: this is just a proxy except for send!!!
    const comm = {
      send: (msg, targets) => self.send(msg, channel, targets),
      startPairing: slaveName => self.startPairing(slaveName),
      unpair: () => self.unpair(),
      stopPairing: () => self.stopPairing(),
      getDeviceVersion(deviceID) {
        if (deviceID === self.deviceID) {
          return self.version;
        }
        if (self.isPaired) {
          return self.devices.find(x => x.id === deviceID).version;
        }
        return null;
      },
      get devices() {
        return self.devices;
      },
      get isPaired() {
        return self.isPaired;
      },
      get isPairing() {
        return self.isPairing;
      },
      get isUnpaired() {
        return self.isUnpaired;
      },
      get masterID() {
        return self.masterID;
      },
      get deviceID() {
        return self.deviceID;
      },
      get deviceName() {
        return self.deviceName;
      },
      get pairingToken() {
        return self.pairingToken;
      },
      get pairingName() {
        return self.pairingName;
      },
      get pairingRemaining() {
        return self.pairingRemaining;
      },
      get masterName() {
        return self.masterName;
      },
      get isMasterConnected() {
        return self.isMasterConnected;
      },
    };
    return [comm];
  }

  unload() {
    this.apps.forEach((app) => {
      if (app.onunload) {
        app.onunload();
      }
    });
    this.apps.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.destroyed = true;
    this.peer = null;
    this.onpairing = null;
    this.onpaired = null;
    this.onunpaired = null;
    this.onmessage = null;
    this.onerror = null;
    this.ondeviceadded = null;
    this.ondeviceremoved = null;
    this.onmasterconnected = null;
    this.onmasterdisconnected = null;
    clearInterval(this.connectionKeeper);
    this.connectionKeeper = null;
    this.isInit = false;
    this.isUnloaded = true;
    this.data = null;
  }

  destroy() {
    this.unload();
  }
}
