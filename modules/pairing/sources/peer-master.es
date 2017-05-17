/* eslint-disable camelcase */
/* global USERAGENT */

import MessageStorage from 'pairing/message-storage';
import CliqzCrypto from 'pairing/crypto';
import console from 'core/console';
import utils from 'core/utils';
import fetch from 'platform/fetch';
import { encryptPairedMessage, decryptPairedMessage, ERRORS, getMessageTargets } from 'pairing/shared';
import { base64_encode, hex_decode } from 'p2p/internal/utils';
import CliqzPeer from 'p2p/cliqz-peer';

const PAIRING_ERRORS = {
  BAD_DEVICE_NAME: 2,
};

function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const maxSize = 5 * 1024 * 1024;

export default class PeerMaster {
  constructor(debug = false) {
    this.pushTime = 1000;
    this.debug = debug;
    this.apps = new Map();
    this.logError = console.error.bind(console);
    if (debug) {
      this.log = console.log.bind(console);
    } else {
      this.log = () => {};
    }
    this.pairingTimeout = 5000;
  }
  setObject(key, object) {
    this.storage.setItem(key, JSON.stringify(object));
  }
  getObject(key, notFound = false) {
    const o = this.storage.getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  }
  getStorage(key) {
    return this.storage ? this.getObject(this.storagePrefix + key, null) : null;
  }
  setStorage(key, value) {
    return this.setObject(this.storagePrefix + key, value);
  }
  clearStorage(key) {
    return this.storage.removeItem(this.storagePrefix + key);
  }
  get keypair() {
    return this.getStorage('keypair');
  }
  get privateKey() {
    return this.keypair[1];
  }

  get publicKey() {
    return this.keypair[0];
  }

  get peerID() {
    return this.getStorage('peerID');
  }

  get pairingData() {
    const slaves = (this.slaves || []).map(({ name, peerID }) => {
      const isConnected = this.masterPeer && this.masterPeer.isPeerConnected(peerID);
      return { name, id: peerID, status: isConnected ? 'connected' : 'disconnected' };
    });
    const pairing = Object.keys(this.pairingDevices).map(peerID => ({ id: peerID, status: 'pairing' }));
    return {
      devices: slaves.concat(pairing),
    };
  }

  get arn() {
    return this.getStorage('arn');
  }

  __unloadSlaves() {
    this.slavesByName = this.slavesById = {};
    this.slaves = [];
  }

  __loadSlaves() {
    this.slaves = (this.getStorage('__slaves') || [])
    .filter(x => // Just in case: ignore slaves with wrong format
      x.name &&
      x.peerID &&
      x.publicKey &&
      x.randomToken
    );

    this.slaves.forEach((slave) => {
      this.slavesById[slave.peerID] = slave;
      this.slavesByName[slave.name] = slave;
    });
  }

  __addSlave(name, peerID, publicKey, randomToken) {
    const slave = {
      name,
      peerID,
      publicKey,
      randomToken,
    };
    this.slaves.push(slave);
    this.slavesById[slave.peerID] = slave;
    this.slavesByName[slave.name] = slave;
    this.setStorage('__slaves', this.slaves);
    this.enableMasterPeerIfNeeded();
    return slave;
  }

  __removeSlaveById(peerID) {
    if (has(this.slavesById, peerID)) {
      const slave = this.slavesById[peerID];
      this.slaves.splice(this.slaves.indexOf(slave), 1);
      delete this.slavesByName[slave.name];
      delete this.slavesById[slave.peerID];
      this.setStorage('__slaves', this.slaves);
      this.disableMasterPeerIfNeeded();
    }
  }

  generateKey() {
    return CliqzPeer.generateKeypair()
    .then((keypair) => {
      this.setStorage('keypair', keypair);
      const publicKey = keypair[0];
      return CliqzCrypto.sha256(publicKey)
        .then(h => this.setStorage('peerID', h));
    })
    .catch(e => this.log(e));
  }
  init(storage, window) {
    if (this.isInit) {
      throw new Error('Module already init!');
    }
    this.window = window;
    this.storage = storage;
    this.storagePrefix = 'PEERMASTER_';

    if (!this.masterName) {
      const info = typeof USERAGENT !== 'undefined' ?
        USERAGENT.analyze(this.window.navigator.userAgent) : { os: {}, device: {} };
      const deviceInfo = info.device.full || 'CLIQZ Mobile Browser';
      const osInfo = info.os.full ? ` (${info.os.full})` : '';
      this.setStorage('masterName', `${deviceInfo}${osInfo}`);
    }

    // to take into account message marshalling overhead
    this.msgStorage = new MessageStorage(storage, maxSize / 2);
    this.masterPeer = null;
    this.slavesByName = {};
    this.slavesById = {};
    this.slaves = [];
    this.pairingDevices = {};

    return Promise.resolve(this.__loadSlaves())
    .then(() => {
      if (!this.keypair) {
        return this.generateKey();
      } else if (!this.peerID) {
        // Migrate
        return CliqzCrypto.sha256(this.keypair[0])
          .then(h => this.setStorage('peerID', h));
      }
      return null;
    })
    .then(() => {
      if (this.msgStorage) {
        this.msgStorage.cleanMessages(this.getTrustedDevices());
      }
      this.enableMasterPeerIfNeeded();
      this.isInit = true;
      this.apps.forEach((app, channel) => {
        if (app.oninit) {
          app.oninit(...this.getOnInitArgs(channel));
        }
      });
      this.checkMessagePusher();
    });
  }

  checkMessagePusher() {
    const disable = () => {
      if (this.pushInterval) {
        utils.clearInterval(this.pushInterval);
        this.pushInterval = null;
      }
    };
    const enable = () => {
      if (!this.pushInterval) {
        this.pushInterval = utils.setInterval(this.messagePusher.bind(this), this.pushTime);
      }
    };
    if (!this.masterPeer) {
      return disable();
    }
    const peers = this.masterPeer.getConnectedPeers();
    if (peers.length === 0) {
      return disable();
    }
    const numMsgs = peers.reduce((a, b) => a + this.msgStorage.getMessages(b).length, 0);
    if (numMsgs === 0) {
      return disable();
    }
    return enable();
  }

  unload(destroy = false) {
    if (this.isInit) {
      this.isInit = false;
      utils.clearInterval(this.pushInterval);
      this.pushInterval = null;
      if (this.masterPeer) {
        try {
          this.masterPeer.destroy();
        } catch (e) {
          this.logError('Error destroying masterPeer', e);
        }
        this.masterPeer = null;
      }
      this.apps.forEach((app) => {
        if (app.onunload) {
          app.onunload();
        }
      });
      this.apps.clear();
      if (destroy) {
        this.clearStorage('__slaves');
        this.clearStorage('keypair');
        this.clearStorage('peerID');
        this.msgStorage.destroy();
      }
      this.storage = null;
      this.__unloadSlaves();
    }
  }

  destroy() {
    return this.unload(true);
  }

  sendMessage(slaveID, msg) {
    if (has(this.slavesById, slaveID)) {
      return this.masterPeer.send(slaveID, msg);
    }
    return Promise.reject('unknown slaveName');
  }

  sendMessages(slaveID, msgs) {
    return Promise.all(msgs.map(x => this.sendMessage(slaveID, x)));
  }

  pushEncryptedMessage(data) {
    const targets = getMessageTargets(data);
    targets.forEach(([peerID]) => {
      if (peerID === this.peerID) {
        decryptPairedMessage(
          data,
          peerID,
          this.privateKey,
        )
        .then(({ type, msg, source }) => this.processMessageForMe(type, msg, source));
      } else {
        this.sendMessage(peerID, data)
        .catch(() => {
          // If we fail sending the message, then store it.
          try {
            this.msgStorage.pushPeerMessage(base64_encode(data), peerID);
            this.checkMessagePusher();
          } catch (e) {
            this.log(e, 'Failed storing message');
          }
        });
      }
    });
  }

  messagePusher() {
    if (this.pushingMessages || !this.masterPeer) {
      return;
    }
    const peers = this.masterPeer.getConnectedPeers();
    if (peers.length === 0) {
      return;
    }
    this.pushingMessages = true;
    try {
      Promise.all(peers.map((peer) => {
        const messages = this.msgStorage.getMessages(peer);
        if (messages && messages.length) {
          return this.sendMessage(peer, messages)
          .then(() => this.msgStorage.clearMessages(peer))
          .catch(e => this.logError('Error pushing messages to peer', peer, e));
        }
        return Promise.resolve();
      }))
      .catch(e => this.logError('Error pushing messages', e))
      .then(() => {
        this.pushingMessages = false;
        this.checkMessagePusher();
      });
    } catch (e) {
      this.logError('[FATAL] Error pushing messages', e);
      this.pushingMessages = false;
    }
  }

  static get EXPIRY_DAYS() {
    return 7;
  }

  static encryptARN(arn, publicKey) {
    const ts = Math.floor(Date.now() / 1000) + (PeerMaster.EXPIRY_DAYS * 3600 * 24);
    const data = new Uint8Array(20);
    const hexArn = arn.replace(/-/g, '');
    if (hexArn.length !== 32) {
      return Promise.reject(new Error('arn length is not 32'));
    }
    data.set(hex_decode(hexArn));
    new DataView(data.buffer).setInt32(16, ts, true);
    const cleanPK = publicKey.split('\n').filter(x => x.trim() && !x.includes('-')).join('');
    return CliqzCrypto.rawEncryptRSA(data, cleanPK)
    .then(x => base64_encode(x));
  }

  setDeviceARN(arn) {
    if (arn && this.peerID) {
      this.setStorage('arn', arn);
      const ids = this.devices.map(x => x.id).filter(x => x !== this.peerID);
      this.notifyARN(ids);
    }
  }

  pushMessage(msg, source, type, targets) {
    const t = targets;
    if (!t || t.length === 0) {
      return Promise.resolve();
    }
    const devices = this.devices.filter(x => t.indexOf(x.id) !== -1);
    return encryptPairedMessage({ msg, source, type }, devices)
    .then(encrypted => this.pushEncryptedMessage(encrypted))
    .catch((e) => {
      this.log('Error pushing message', e);
    });
  }

  get masterName() {
    return this.getStorage('masterName');
  }

  get devices() {
    return this.getTrustedDevices().map(x => ({
      id: x,
      name: x === this.peerID ? this.masterName : this.slavesById[x].name,
      publicKey: x === this.peerID ? this.publicKey : this.slavesById[x].publicKey,
    }));
  }

  notifyNewPeer(peerID) {
    const devices = this.slaves.map(slave => slave.peerID);
    this.pushMessage(this.devices.find(x => x.id === peerID), peerID, '__NEWPEER', devices);
    this.notifyARN([peerID]);
  }

  notifyARN(deviceIDS) {
    const arn = this.arn;
    if (arn && this.peerID) {
      return Promise.resolve()
      .then(() => {
        if (this._pusherPK) {
          return this._pusherPK;
        }
        return fetch('https://p2p-pusher.cliqz.com/pk')
        .then(response => response.json())
        .then(({ publicKey }) => {
          this._pusherPK = publicKey;
          return publicKey;
        });
      })
      .then(publicKey => PeerMaster.encryptARN(arn, publicKey))
      .then(token => this.pushMessage(token, this.peerID, '__NEWARN', deviceIDS));
    }
    return Promise.reject(new Error('no arn found'));
  }

  changeDeviceName(peerID, newName) {
    const slave = this.slavesById[peerID];
    if (slave) {
      try {
        PeerMaster.checkDeviceName(newName);
        delete this.slavesByName[slave.name];
        const uniqueDeviceName = this.getUniqueDeviceName(newName);
        slave.name = uniqueDeviceName;
        this.slavesByName[uniqueDeviceName] = slave;
        this.setStorage('__slaves', this.slaves);
        this.notifyNewPeer(peerID);
        this.propagateEvent('statusChanged');
      } catch (e) {
        this.notifyPairingError(PAIRING_ERRORS.BAD_DEVICE_NAME);
      }
    }
  }

  static checkDeviceName(deviceName) {
    if (!deviceName || typeof deviceName !== 'string') {
      throw new Error(ERRORS.PAIRING_DEVICE_NAME_EMPTY);
    }
    if (deviceName.length > 32) {
      throw new Error(ERRORS.PAIRING_DEVICE_NAME_TOOLONG);
    }
  }

  processPairingMessage(peerID, publicKey, deviceName, { randomToken }) {
    this.log(`Registering Slave: ${deviceName} ${peerID}`);
    return CliqzCrypto.sha256(publicKey)
    .then((h) => {
      // Error handling
      if (h !== peerID) {
        throw new Error(ERRORS.PAIRING_PUBLICKEY_MISMATCH);
      }

      PeerMaster.checkDeviceName(deviceName);
      const uniqueDeviceName = this.getUniqueDeviceName(deviceName);

      if (has(this.slavesById, peerID)) {
        this.__removeSlaveById(peerID);
        this.msgStorage.removePeer(peerID);
      }
      this.__addSlave(uniqueDeviceName, peerID, publicKey, randomToken);
      this.msgStorage.addPeer(peerID);
      this.removePairingDevice(peerID);
      const devices = this.devices;

      return this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.sendEncrypted({ devices }, aesKey))
      .then(encrypted => this.masterPeer.send(peerID, encrypted))
      .then(() => {
        this.propagateEvent('ondeviceadded', { id: peerID, name: uniqueDeviceName });
        this.notifyNewPeer(peerID);
      });
    })
    .catch((e) => {
      this.logError(e, 'Error pairing');
      this.__removeSlaveById(peerID);
      this.msgStorage.removePeer(peerID);
      this.checkMessagePusher();
      this.removePairingDevice(peerID);
      this.notifyPairingError();
    });
  }

  processMessageForMe(type, msg, source) {
    if (type === 'remove_peer') {
      // Special type, but we also allow for observers (for testing)
      this._removePeer(source);
    }
    this.log(msg, 'Handling message!!!');
    const app = this.apps.get(type);
    if (app && app.onmessage) {
      app.onmessage(msg, source, type);
    }
  }
  processMessage(data, label, peerID) {
    if (has(this.slavesById, peerID)) {
      this.pushEncryptedMessage(data);
    } else if (has(this.pairingDevices, peerID)) {
      const device = this.pairingDevices[peerID];
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.receiveEncrypted(data, aesKey))
      .then((decrypted) => {
        const [publicKey, deviceName] = decrypted;
        return this.processPairingMessage(peerID, publicKey, deviceName, device);
      })
      .catch((e) => {
        this.log('Error receiving pairing message', e);
        this.removePairingDevice(peerID);
        this.notifyPairingError();
      })
      .then(() => {
        this.checkMessagePusher();
      });
    } else {
      this.log('ERROR: unknown peerID', peerID);
    }
  }

  loadPairingAESKey(peerID) {
    const device = this.pairingDevices[peerID] || this.slavesById[peerID];
    if (device && device.randomToken) {
      const random = CliqzCrypto.toByteArray(device.randomToken, 'b64');
      return CliqzCrypto.deriveAESKey(random);
    }
    return Promise.reject(new Error(`loadPairingAESKey: unknown peer ${peerID}`));
  }

  // Assuming keypair is already generated
  enableMasterPeerIfNeeded() {
    const numPairing = Object.keys(this.pairingDevices).length;
    const numDevices = Object.keys(this.slaves).length;
    if (this.masterPeer || (numPairing === 0 && numDevices === 0)) {
      return;
    }

    this.masterPeer = new CliqzPeer(
      this.window,
      this.keypair,
      {
        DEBUG: this.debug,
      },
    );

    this.masterPeer.encryptSignaling = (data, peerID) =>
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.sendEncrypted(data, aesKey))
      .catch(() => data);

    this.masterPeer.decryptSignaling = (data, peerID) =>
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.receiveEncrypted(data, aesKey))
      .catch(() => data);

    this.masterPeer.onmessage = this.processMessage.bind(this);
    this.masterPeer.setMessageSizeLimit(maxSize);
    this.masterPeer.onconnect = (peerID) => {
      this.propagateEvent('statusChanged');
      if (has(this.slavesById, peerID)) {
        this.checkMessagePusher();
      } else if (!has(this.pairingDevices, peerID)) {
        this.log('Unknown peer', peerID);
      }
    };
    this.masterPeer.ondisconnect = (peer) => {
      this.log('Connection with', peer, 'was closed');
      this.removePairingDevice(peer, true);
      this.disableMasterPeerIfNeeded();
      this.propagateEvent('statusChanged');
      this.checkMessagePusher();
    };

    this.getTrustedDevices().forEach((slaveID) => {
      if (slaveID !== this.peerID) {
        this.masterPeer.addTrustedPeer(slaveID);
      }
    });

    this.checkConnections();
  }

  checkConnections() {
    if (this.masterPeer) {
      this.masterPeer.createConnection().then(() => {
        this.getTrustedDevices().forEach((slaveID) => {
          if (slaveID !== this.peerID) {
            this.masterPeer.checkPeerConnection(slaveID)
            .catch(() => {});
          }
        });
      });
    }
  }

  disableMasterPeerIfNeeded() {
    const numPairing = Object.keys(this.pairingDevices).length;
    const numDevices = Object.keys(this.slaves).length;
    if (numPairing === 0 && numDevices === 0) {
      if (this.masterPeer) {
        this.masterPeer.destroy();
        this.masterPeer = null;
      }
    }
  }

  addPairingDevice(deviceID, data) {
    if (!has(this.pairingDevices, deviceID)) {
      this.pairingDevices[deviceID] = data;
      this.enableMasterPeerIfNeeded();
      this.masterPeer.addTrustedPeer(deviceID);
      this.propagateEvent('statusChanged');
      this.masterPeer.connectPeer(deviceID)
      .then(() => {
        utils.setTimeout(() => this.removePairingDevice(deviceID, true), this.pairingTimeout);
      })
      .catch(() => this.removePairingDevice(deviceID, true));
    }
  }

  notifyPairingError(error = 1) {
    this.propagateEvent('onpairingerror', error);
    this.propagateEvent('statusChanged');
  }

  removePairingDevice(deviceID, error = false) {
    if (has(this.pairingDevices, deviceID)) {
      delete this.pairingDevices[deviceID];
      if (this.masterPeer && !has(this.slavesById, deviceID)) {
        this.masterPeer.removeTrustedPeer(deviceID);
      }
      this.disableMasterPeerIfNeeded();
      if (error) {
        this.notifyPairingError();
      }
    }
  }

  _removePeer(deviceID) {
    const slave = this.slavesById[deviceID];
    const deviceName = slave && slave.name;
    this.unregisterSlave(deviceID);
    const devices = this.slaves.map(s => s.peerID);
    this.pushMessage({}, deviceID, '__REMOVEDPEER', devices);
    this.propagateEvent('ondeviceremoved', { id: deviceID, name: deviceName });
  }

  // Use this to unpair device from mobile
  unpair(deviceID) {
    const promise = new Promise((resolve, reject) => {
      utils.setTimeout(reject, 1000);
      this.pushMessage({}, deviceID, '__REMOVEDPEER', [deviceID])
        .then(resolve)
        .catch(reject);
    });
    return promise
      .catch(() => {})
      .then(() => this._removePeer(deviceID));
  }

  qrCodeValue(value) {
    if (this.msgStorage) {
      this.msgStorage.cleanMessages(this.getTrustedDevices());
    }
    try {
      const [id64, randomToken] = value.split(':');
      const deviceID = CliqzCrypto.fromByteArray(CliqzCrypto.toByteArray(id64, 'b64'), 'hex');
      if (CliqzPeer.isPeerAuthenticated(deviceID)) {
        this.addPairingDevice(deviceID, { randomToken });
      } else {
        throw new Error('slave peerID must be authenticated (64 chars)');
      }
    } catch (e) {
      this.notifyPairingError();
    }
  }

  propagateEvent(eventName, ...args) {
    this.apps.forEach((x) => {
      if (x[eventName]) {
        try {
          x[eventName](...args);
        } catch (e) {
          this.logError('Error propagating event', eventName, args, e);
        }
      }
    });
  }

  static sendEncrypted(message, aesKey) {
    return CliqzCrypto.encryptStringAES(JSON.stringify(message), aesKey);
  }

  static receiveEncrypted(data, aesKey) {
    return CliqzCrypto.decryptStringAES(data, aesKey)
    .then(message => JSON.parse(message));
  }

  unregisterSlave(deviceID) {
    if (has(this.slavesById, deviceID)) {
      this.msgStorage.removePeer(deviceID);
      this.checkMessagePusher();
      if (this.masterPeer) this.masterPeer.removeTrustedPeer(deviceID);
      this.__removeSlaveById(deviceID);
    }
  }

  getTrustedDevices() {
    return this.slaves.map(slave => slave.peerID).concat(this.peerID);
  }

  getUniqueDeviceName(deviceName) {
    const names = new Set(this.devices.map(x => x.name));
    let name = deviceName;
    let cnt = 2;
    while (!name || names.has(name)) {
      name = `${deviceName} (${cnt})`;
      cnt += 1;
    }
    return name;
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

  removeObserver(channel, observer) {
    if (this.apps.get(channel) === observer) {
      this.apps.delete(channel);
    }
  }

  getOnInitArgs(channel) {
    const self = this;
    const comm = {
      send(msg, targets) {
        let t = targets;
        if (!t) {
          return Promise.resolve();
        }
        if (t && !Array.isArray(t)) {
          t = [t];
        }
        return self.pushMessage(msg, self.peerID, channel, t);
      },
      unpair(deviceID) {
        return self.unpair(deviceID);
      },
      get devices() {
        return self.devices;
      },
      get masterName() {
        return self.masterName;
      },
    };
    return [comm];
  }
}
