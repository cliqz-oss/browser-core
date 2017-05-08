// TODO: right now removing old messages if they increase max size...
// TODO: using localStorage, at some point we need to think of sth else...

export default class MessageStorage {
  constructor(storage, maxSize) {
    this.storagePeerListKey = '__PEERMSGS_PEERLIST';
    this.storagePeerMessageKey = '__PEERMSGS_MESSAGES_';
    this.messages = {};
    this.maxSize = Math.max(1024, maxSize || (1024 * 1024) / 2);
    this.storage = storage;
    this._loadData();
  }
  cleanMessages(peers) {
    const myPeers = new Set(JSON.parse(this.storage.getItem(this.storagePeerListKey) || '[]'));
    const yourPeers = new Set(peers || []);
    myPeers.forEach((peerID) => {
      if (!yourPeers.has(peerID)) {
        this.removePeer(peerID);
      }
    });
  }
  _has(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  _persistPeerList() {
    this.storage.setItem(this.storagePeerListKey, JSON.stringify(Object.keys(this.messages)));
  }
  _persistPeerMessages(peer) {
    const messages = this.messages[peer];
    let sm = JSON.stringify(messages);
    while (sm.length > this.maxSize) {
      messages.splice(0, 1);
      sm = JSON.stringify(messages);
    }
    this.storage.setItem(this.storagePeerMessageKey + peer, sm);
  }
  _loadPeerMessages(peer) {
    const msg = this.storage.getItem(this.storagePeerMessageKey + peer);
    this.messages[peer] = msg ? JSON.parse(msg) : [];
  }
  _loadData() {
    let peers = this.storage.getItem(this.storagePeerListKey);
    if (peers) {
      peers = JSON.parse(peers);
      peers.forEach((peer) => {
        this._loadPeerMessages(peer);
      });
    }
  }
  addPeer(peer, deferPersist) {
    if (!this._has(this.messages, peer)) {
      this.messages[peer] = [];
      if (!deferPersist) {
        this._persistPeerList();
      }
    }
  }
  addPeers(peers) {
    peers.forEach((peer) => {
      this.addPeer(peer, true);
    });
    this._persistPeerList();
  }
  popPeerMessage(peer) {
    this.addPeer(peer);
    if (this.messages[peer].length) {
      this.messages[peer].splice(0, 1);
    }
    this._persistPeerMessages(peer);
  }
  pushPeerMessage(msg, peer) {
    this.addPeer(peer);
    this.messages[peer].push(msg);
    this._persistPeerMessages(peer);
  }
  pushPeerMessages(msgs, peer) {
    this.addPeer(peer);
    Array.prototype.push.apply(this.messages[peer], msgs);
    this._persistPeerMessages(peer);
  }
  pushMessage(msg, peers, source) {
    const myPeers = peers && peers.length > 0 ? peers : Object.keys(this.messages);
    myPeers.forEach((peer) => {
      if (peer !== source) {
        this.pushPeerMessage(msg, peer);
      }
    });
  }
  getMessages(peer) {
    return this.messages[peer] || [];
  }
  clearMessages(peer) {
    this.messages[peer] = [];
    this.storage.removeItem(this.storagePeerMessageKey + peer);
  }
  removePeer(peer) {
    this.clearMessages(peer);
    delete this.messages[peer];
    this._persistPeerList();
  }
  destroy() {
    this.storage.removeItem(this.storagePeerListKey);
    this.storage.removeItem(this.storagePeerMessageKey);
  }
}
