import { utils } from '../core/cliqz';

import console from './console';
import { AUTH_METHOD
       , SOCKS5
       , parseHandshake } from './socks-protocol';
import { wrapOnionRequest
       , sendOnionRequest
       , decryptResponseFromExitNode } from './rtc-onion';
import { generateAESKey, generateAESIv, packAESKeyAndIv } from './rtc-crypto';
import MessageQueue from './message-queue';


// From:  http://stackoverflow.com/a/6274381
/**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
function shuffle(array) {
  const result = [...array];
  let j;
  let x;
  for (let i = result.length; i; i -= 1) {
    j = Math.floor(Math.random() * i);
    x = result[i - 1];
    result[i - 1] = result[j];
    result[j] = x;
  }
  return result;
}


const PUB_KEYS = new Map();
function getPubKey(peer) {
  // Check cache first
  if (PUB_KEYS.has(peer)) {
    return Promise.resolve(PUB_KEYS.get(peer));
  }

  // Fetch public key and store it in cache
  return new Promise((resolve, reject) => {
    utils.httpPost(
      'https://hpn-sign.cliqz.com/getpublickey/',
      (res) => {
        console.debug(`proxyPeer SocksToRTC fetched public key for ${peer}`);
        const key = { pubKey: JSON.parse(res.response).key, name: peer };
        PUB_KEYS.set(peer, key);
        resolve(key);
      },
      JSON.stringify({ peername: peer }),
      reject);
  });
}


function fetchRemotePeers(peerID) {
  return new Promise((resolve, reject) => {
    utils.httpGet(
      'https://hpn-sign.cliqz.com/listpeers',
      (res) => {
        // Extract remote peer ids
        const remotePeers = JSON.parse(res.response).peers.up.filter(peer => peer !== peerID);
        // Get public keys
        Promise.all(remotePeers.map(getPubKey)).then(resolve);
      },
      reject,
    );
  });
}


class SocksConnection {

  constructor(tcpConnection, peer, route) {
    this.id = tcpConnection.id;
    this.clientConnection = tcpConnection;
    this.toRtcQueue = MessageQueue(
      'client-to-rtc',
      data => this.proxy(data),
    );

    // Created when connection is established
    this.aesKey = null;
    this.iv = null;
    this.packedAESKey = null;

    // Information about where to route this request
    this.peer = peer;
    this.route = route;
    this.messageNumber = 1;

    // Events
    this.onClose = undefined;
  }


  /* Close Socks connection and optionaly sends a last message to client.
   *
   * @param {String|null} msg - Sends a message to client before closing.
   */
  close(msg) {
    console.debug(`proxyPeer CLIENT ${this.id} garbage collect connection`);
    if (msg) {
      this.clientConnection.sendData(msg, msg.length);
    }

    // Close all connections
    this.clientConnection.close();

    if (this.onClose !== undefined) {
      this.onClose();
    }
  }

  /* Initializes SOCKS5 proxy connection with client. Takes care of:
   * 1. Handshake with the client.
   * 2. Establishing connection with destination host.
   * 3. Proxy following data chunks between client and destination.
   *
   * Note: SOCKS5 protocol is described here: https://tools.ietf.org/html/rfc1928
   */
  initSocksConnection() {
    // Establish SOCKS connection
    this.clientConnection.getNextData()
      .then(data => this.handshake(data))
      .then(() => this.clientConnection.getNextData())
      .then((data) => {
        this.clientConnection.registerCallbackOnData(chunk => this.toRtcQueue.push(chunk));
        this.establishConnection(data);
      })
      .catch(ex => console.debug(`proxyPeer CLIENT ${this.id} failed to establish socks connection ${ex}`));
  }

  onDataFromDestination(encrypted) {
    // Decrypt data with AES keys
    return decryptResponseFromExitNode(encrypted, this.aesKey, this.iv)
      .then((decrypted) => {
        const data = new Uint8Array(decrypted);
        this.clientConnection.sendData(data, data.length);
      });
  }

  // Internals: SOCKS5 protocol handling

  /* Given first chunk of data sent by client, take appropriate actions
   * for a successful handshake. This is the first step of SOCKS5 connection
   * where authentication method negociation happens, as well as SOCKS
   * protocol version check.
   *
   * @param {Uint8Array} data - first data chunk sent by client.
   */
  handshake(data) {
    const handshake = parseHandshake(data);
    console.debug(`proxyPeer CLIENT ${this.id} initiate handshake`);

    if (handshake.VER !== SOCKS5) {
      console.error(`proxyPeer CLIENT ${this.id} socks version error ${handshake.VER}`);
      // TODO: Check if we should return an error code
      // End socket clientConnection
      this.close();
      return Promise.reject('Wrong socks version');
    }

    const resp = new Uint8Array(2);
    resp[0] = SOCKS5; // Socks version

    // Check authent method
    if (!handshake.METHODS.includes(AUTH_METHOD.NOAUTH)) {
      console.debug(`proxyPeer CLIENT ${this.id} no valid authent method found`);
      // Close socket (client must close it)
      resp[1] = 0xFF;
      this.close(resp);
      return Promise.reject('Wrong authent method');
    }

    // Accept authent
    resp[1] = AUTH_METHOD.NOAUTH;

    return this.clientConnection.sendData(resp, resp.length);
  }

  /* After handshake, the second chunk of data should contain information
   * about kind of connection as well as destination (host + port). Open
   * a socket to the destination and inform the client.
   *
   * @param {Uint8Array} data - second data chunk sent by client.
   */
  establishConnection(data) {
    try {
      // Create webrtc connection
      return generateAESKey().then((aesKey) => {
        this.aesKey = aesKey;
        this.iv = generateAESIv();
        const pubKeyExitNode = this.route[this.route.length - 1].pubKey;

        return packAESKeyAndIv(aesKey, this.iv, pubKeyExitNode).then((packedAESKey) => {
          this.packedAESKey = packedAESKey;
          const messageNumber = this.messageNumber;
          this.messageNumber += 1;
          return wrapOnionRequest(data, this.route, this.id, packedAESKey, messageNumber)
            .then(onionRequest =>
              sendOnionRequest(onionRequest, this.route, this.peer)
                .then(() => {
                  console.debug(`proxyPeer CLIENT ${this.id} ${messageNumber} sends ${onionRequest.length}`);
                }),
          );

          // Note: Socks response is handled by the exit node and will be
          // transmitted directly to client.
        });
      });
    } catch (ex) {
      // TODO: set REP with error code and send it to client before closing.
      // this.clientConnection.sendData(data, data.length);
      console.error(`proxyPeer CLIENT ${this.id} error while establishing connection ${ex}`);
      this.close();
      return Promise.reject(ex);
    }
  }

  /* Once handshake with client is done and connection to destination
   * host is established, proxy all data sent by client, to destination.
   *
   * @param {Uint8Array} data - Data chunk received from client.
   */
  proxy(data) {
    try {
      const messageNumber = this.messageNumber;
      this.messageNumber += 1;
      return wrapOnionRequest(data, this.route, this.id, null, messageNumber)
        .then(onionRequest => sendOnionRequest(onionRequest, this.route, this.peer)
          .then(() => {
            this.dataOut += onionRequest.length;
            console.debug(`proxyPeer CLIENT ${this.id} ${messageNumber} sends ${onionRequest.length}`);
          }),
        );
    } catch (ex) {
      return Promise.reject(ex);
    }
  }
}


export default class {
  constructor(peer, socksProxy) {
    // {connectionID => SocksConnection} Opened connections
    this.connections = new Map();

    // Fetch a new list of peers from time to time
    this.availablePeers = [];
    fetchRemotePeers().then((peers) => { this.availablePeers = peers; });
    this.updateInterval = utils.setInterval(
      () => {
        fetchRemotePeers(peer.peerID)
          .then((peers) => {
            console.debug(`proxyPeer SocksToRTC found ${peers.length} peers`);
            this.availablePeers = peers;
          });
      },
      10 * 1000);

    // Display a health check
    this.receivedMessages = 0;
    this.dataIn = 0;
    this.dataOut = 0;
    this.healthCheck = utils.setInterval(
      () => {
        console.debug(`proxyPeer CLIENT healthcheck ${JSON.stringify(this.healthcheck())}`);
      },
      60 * 1000);


    // Register handler to SocksProxy
    console.debug('proxyPeer SocksToRTC SocksToRTC attach listener');
    socksProxy.addSocketOpenListener((tcpConnection) => {
      if (this.availablePeers.length >= 2) {
        console.debug('proxyPeer SocksToRTC new connection from socks proxy');

        // Choose a route for this connection
        const shuffledPeers = shuffle(this.availablePeers);
        const route = [
          shuffledPeers[0],
          shuffledPeers[1],
        ];

        // Wrap TcpSocket into a SocksConnection to handle Socks5 protocol
        const socks = new SocksConnection(tcpConnection, peer, route);
        socks.initSocksConnection();

        // Keep track of opened connections
        this.connections.set(socks.id, socks);

        // Remove closed connection
        socks.onClose = () => {
          console.debug(`proxyPeer SocksToRTC delete connection ${socks.id}`);
          this.connections.delete(socks.id);
        };

        // Clean-up when tcp socket is closed
        tcpConnection.registerCallbackOnClose(() => {
          socks.close();
        });
      } else {
        console.debug(`proxyPeer SocksToRTC not enough peers to route request (${this.availablePeers.length})`);
      }
    });
  }

  healthcheck() {
    return {
      receivedMessages: this.receivedMessages,
      droppedMessages: this.droppedMessages,
      dataIn: this.dataIn,
      dataOut: this.dataOut,
      currentOpenedConnections: this.connections.size,
    };
  }

  stop() {
    utils.clearInterval(this.updateInterval);
    utils.clearInterval(this.healthCheck);
  }

  handleClientMessage(message) {
    const data = message.data;
    const connectionID = message.connectionID;

    console.debug(`proxyPeer CLIENT ${connectionID} ${message.messageNumber} receives ${data.length}`);

    this.receivedMessages += 1;
    this.dataIn += data.length;

    // We are the client, so give it back to the proxy somehow
    try {
      if (this.connections.has(connectionID)) {
        return this.connections.get(connectionID).onDataFromDestination(data);
      }

      return Promise.resolve();
    } catch (ex) {
      return Promise.reject(ex);
    }
  }
}
