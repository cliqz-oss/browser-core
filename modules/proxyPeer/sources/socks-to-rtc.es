import { utils } from '../core/cliqz';
import { fromUTF8 } from '../core/encoding';

import logger from './logger';
import { AUTH_METHOD
       , SOCKS5
       , parseHandshake } from './socks-protocol';
import { wrapOnionRequest
       , sendOnionRequest
       , decryptResponseFromExitNode
       , ERROR_CODE } from './rtc-onion';
import { generateAESKey, wrapAESKey } from './rtc-crypto';
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


function fetchRemotePeers(peerID, peersUrl) {
  return new Promise((resolve, reject) => {
    utils.httpGet(
      peersUrl,
      (res) => {
        // Extract remote peer ids
        const data = JSON.parse(res.response);

        const peers = [];
        Object.keys(data).forEach((name) => {
          if (peerID !== name) {
            peers.push({
              name,
              pubKey: data[name],
            });
          }
        });

        resolve(peers);
      },
      reject,
    );
  });
}


class SocksConnection {

  constructor(tcpConnection, peer, route) {
    this.lastActivity = Date.now();

    this.id = tcpConnection.id;
    this.clientConnection = tcpConnection;
    this.toRtcQueue = MessageQueue(
      'client-to-rtc',
      data => this.proxy(data),
    );

    // Created when connection is established
    this.aesKey = null;
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
    logger.debug(`CLIENT ${this.id} closing connection`);
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
    try {
      return this.clientConnection.getNextData()
        .then(data => this.handshake(data))
        .then(() => this.clientConnection.getNextData())
        .then((data) => {
          this.clientConnection.registerCallbackOnData(chunk => this.toRtcQueue.push(chunk));
          return this.establishConnection(data);
        });
    } catch (ex) {
      // Socks connection failed
      return Promise.reject(ex);
    }
  }

  onDataFromDestination(encrypted) {
    this.lastActivity = Date.now();
    // Decrypt data with AES keys
    return decryptResponseFromExitNode(encrypted, this.aesKey)
      .then((decrypted) => {
        try {
          const errorMessage = JSON.parse(fromUTF8(decrypted));
          // Handle error from exit node, close connection immediatly
          if (errorMessage.error !== undefined) {
            logger.log(`CLIENT ${errorMessage.connectionID} received error ${errorMessage.error} from exit`);
            return Promise.resolve(this.close());
          }
        } catch (ex) {
          /* Ignore */
        }

        // No error code, proxy data chunk to client
        const data = new Uint8Array(decrypted);
        return this.clientConnection.sendData(data, data.length);
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
    logger.debug(`CLIENT ${this.id} initiate handshake`);

    if (handshake.VER !== SOCKS5) {
      logger.error(`CLIENT ${this.id} socks version error ${handshake.VER}`);
      // TODO: Check if we should return an error code
      // End socket clientConnection
      this.close();
      return Promise.reject('Wrong socks version');
    }

    const resp = new Uint8Array(2);
    resp[0] = SOCKS5; // Socks version

    // Check authent method
    if (!handshake.METHODS.includes(AUTH_METHOD.NOAUTH)) {
      logger.error(`CLIENT ${this.id} no valid authent method found`);
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
    // Create webrtc connection
    return generateAESKey().then((aesKey) => {
      // Generate AES key and wrap it with key of exit node
      this.aesKey = aesKey;
      const pubKeyExitNode = this.route[this.route.length - 1].pubKey;

      return wrapAESKey(aesKey, pubKeyExitNode).then((packedAESKey) => {
        this.packedAESKey = packedAESKey;
        const messageNumber = this.messageNumber;
        this.messageNumber += 1;
        return wrapOnionRequest(data, this.route, this.id, packedAESKey, messageNumber)
          .then(onionRequest => sendOnionRequest(onionRequest, this.route, this.peer)
            .then(() => logger.debug(`CLIENT ${this.id} ${messageNumber} sends ${onionRequest.length}`))
          );

        // Note: Socks response is handled by the exit node and will be
        // transmitted directly to client.
      });
    });
  }

  /* Once handshake with client is done and connection to destination
   * host is established, proxy all data sent by client, to destination.
   *
   * @param {Uint8Array} data - Data chunk received from client.
   */
  proxy(data) {
    this.lastActivity = Date.now();

    try {
      const messageNumber = this.messageNumber;
      this.messageNumber += 1;
      return wrapOnionRequest(data, this.route, this.id, null, messageNumber)
        .then(onionRequest => sendOnionRequest(onionRequest, this.route, this.peer)
          .then(() => {
            logger.debug(`CLIENT ${this.id} ${messageNumber} sends ${onionRequest.length}`);
          }),
        );
    } catch (ex) {
      return Promise.reject(ex);
    }
  }
}


class AvailablePeers {
  constructor(peersUrl, peer) {
    this.peersUrl = peersUrl;
    this.peer = peer;

    // Blacklist for peers
    this.blacklist = new Map();
    this.availablePeers = [];
    this.update();
  }

  get length() {
    return this.availablePeers.length;
  }

  updatePeers() {
    // Fetch peers from time to time
    return fetchRemotePeers(this.peer.peerID, this.peersUrl)
      .then(peers => peers.filter(({ name }) => !this.blacklist.has(name)))
      .then((peers) => {
        logger.debug(`SocksToRTC found ${peers.length} peers`);
        this.availablePeers = peers;
      });
  }

  updateBlacklist() {
    // Remove peers from blacklist after `timeout` seconds.
    this.blacklist.forEach(({ added, timeout }, name) => {
      const timestamp = Date.now();
      if (added < (timestamp - timeout)) {
        logger.log(`Remove ${name} from blacklist`);
        this.blacklist.delete(name);
      }
    });
  }

  update() {
    return Promise.all([
      this.updatePeers(),
      this.updateBlacklist(),
    ]);
  }

  getRandomRoute() {
    // Choose a route for this connection
    const shuffledPeers = shuffle(this.availablePeers);
    return [
      shuffledPeers[0],
      shuffledPeers[1],
    ];
  }

  blacklistPeer(peer) {
    const peerName = peer.name;
    logger.error(`blacklist ${peerName}`);

    this.blacklist.set(peerName, {
      timeout: 1000 * 60 * 10, // 10 minutes
      added: Date.now(),
    });

    // Remove the peer from available peers
    this.availablePeers = this.availablePeers.filter(({ name }) => name !== peerName);
  }
}


export default class {
  constructor(peer, socksProxy, peersUrl) {
    // {connectionID => SocksConnection} Opened connections
    this.connections = new Map();

    this.peers = new AvailablePeers(peersUrl, peer);

    this.actionInterval = utils.setInterval(
      () => {
        // Update peers:
        // 1. Clean-up blacklist.
        // 2. Fetch a new list of available peers.
        this.peers.update();

        // Display health check as well
        logger.log(`CLIENT healthcheck ${JSON.stringify(this.healthcheck())}`);

        // Garbage collect inactive connections
        const timestamp = Date.now();
        this.connections.forEach((connection, connectionID) => {
          const lastActivity = connection.lastActivity;
          // Garbage collect connection inactive for 20 seconds
          if (lastActivity < (timestamp - (1000 * 20))) {
            // NOTE: Garbage collection does not mean the connection failed
            // (peers where offline or encountered an exception). It can be that
            // the connection was just maintenained opened? There does not seem
            // to be a direct correlation between: GC and peer connectivity
            // issue.
            logger.debug(`CLIENT ${connectionID} garbage collect`);
            // Close connection + remove from connections Map.
            connection.close();
            // NOTE: onClose will automatically remove the connection from the
            // map of connections. So not need to do it here.
          }
        });
      },
      10 * 1000);

    // Register handler to SocksProxy
    logger.log('SocksToRTC attach listener');
    socksProxy.addSocketOpenListener((tcpConnection) => {
      if (this.peers.length >= 2) {
        logger.debug('SocksToRTC new connection from socks proxy');

        const route = this.peers.getRandomRoute();

        // Wrap TcpSocket into a SocksConnection to handle Socks5 protocol
        const socks = new SocksConnection(tcpConnection, peer, route);
        socks.initSocksConnection()
          .catch((e) => {
            logger.error(`CLIENT ${socks.id} error while establishing connection: ${e}`);
            // Close connection as soon as possible so that the request can be
            // retried by the browser.
            socks.close();
            this.peers.blacklistPeer(route[0]);
          });

        // Keep track of opened connections
        this.connections.set(socks.id, socks);

        // Remove closed connection
        socks.onClose = () => {
          logger.debug(`SocksToRTC delete connection ${socks.id}`);
          this.connections.delete(socks.id);
        };

        // Clean-up when tcp socket is closed
        tcpConnection.registerCallbackOnClose(() => {
          socks.close();
        });
      } else {
        logger.error(`SocksToRTC not enough peers to route request (${this.peers.length})`);
      }
    });
  }

  healthcheck() {
    return {
      currentOpenedConnections: this.connections.size,
    };
  }

  stop() {
    utils.clearInterval(this.actionInterval);
  }

  unload() {
    this.stop();

    // Close all remaining connections
    this.connections.forEach((connection) => {
      connection.close();
    });
  }

  isOpenedConnection(connectionID) {
    return this.connections.has(connectionID);
  }

  /**
   * Handle data coming from RTC peers.
   */
  handleClientMessage(message) {
    const data = message.data;
    const connectionID = message.connectionID;

    // We are the client, so give it back to the proxy
    try {
      if (this.connections.has(connectionID)) {
        const connection = this.connections.get(connectionID);
        // Handle errors from relay
        if (message.error !== undefined) {
          logger.log(`CLIENT received error ${message.error} from relay`);

          if (message.error === ERROR_CODE.RELAY_CANNOT_CONNECT_TO_EXIT) {
            // Close connection + blacklist exit node.
            connection.close();
            return Promise.resolve(this.peers.blacklistPeer(connection.route[1]));
          }

          return Promise.resolve();
        }

        return connection.onDataFromDestination(data);
      }

      logger.debug(`CLIENT ${connectionID} drops message: connection does not exist`);
      return Promise.resolve();
    } catch (ex) {
      logger.error(`CLIENT encountered exception ${ex} ${ex.stack} ${JSON.stringify(message)}`);
      return Promise.reject(ex);
    }
  }
}
