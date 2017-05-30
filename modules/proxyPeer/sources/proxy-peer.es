import { utils } from '../core/cliqz';

import CliqzPeer from '../p2p/cliqz-peer';

import logger from './logger';
import MessageQueue from './message-queue';
import SocksProxy from './socks-proxy';
import RTCRelay from './rtc-relay';
import RTCToNet from './rtc-to-net';
import SocksToRTC from './socks-to-rtc';
import { decryptPayload } from './rtc-onion';


/**
 * Wrap a MessageQueue into a multiplexer. It exposes a different `push`
 * function, with an extra argument `key`. For each different value of key,
 * a different queue is created. This is to allow more concurrency in the way
 * requests belonging to different connections are processed.
 *
 * It also implements a mechanism to garbage collect un-used queues.
 */
function MultiplexedQueue(name, callback) {
  const queues = Object.create(null);
  const push = (key, msg) => {
    let messageQueue = queues[key];

    if (messageQueue === undefined) {
      const subName = `${name}_${key}`;
      messageQueue = {
        queue: MessageQueue(subName, callback),
        lastActivity: Date.now(),
      };
      queues[key] = messageQueue;
    } else {
      // Refresh last activity
      messageQueue.lastActivity = Date.now();
    }

    messageQueue.queue.push(msg);
  };

  // Clean-up unused queues
  const closeDeadConnections = utils.setInterval(
    () => {
      const timestamp = Date.now();
      Object.keys(queues).forEach((key) => {
        const { lastActivity } = queues[key];
        if (lastActivity < (timestamp - (1000 * 30))) {
          logger.debug(`${name}_${key} garbage collect`);
          delete queues[key];
        }
      });
    },
    10 * 1000);

  return {
    push,
    unload() {
      utils.clearInterval(closeDeadConnections);
    }
  };
}


export default class {
  constructor(signalingUrl, peersUrl, policy, p2p) {
    // External dependency
    this.p2p = p2p;

    // Create a socks proxy
    this.socksProxy = new SocksProxy();
    this.peer = null;
    this.ppk = null;

    this.socksToRTC = null;
    this.rtcRelay = null;
    this.rtcToNet = null;

    this.signalingURL = signalingUrl;
    this.peersUrl = peersUrl;
    this.policy = policy;
  }

  createPeer() {
    return CliqzPeer.generateKeypair()
      .then((ppk) => { this.ppk = ppk; })
      .then(() =>
        this.p2p.action(
          'createPeer',
          this.ppk,
          {
            ordered: true,
            brokerUrl: this.signalingURL,
            maxReconnections: 0,
            maxMessageRetries: 0,
            chunkSize: 100 * 1024,
            DEBUG: true,
          }
        )
      )
      .then((p) => {
        this.peer = p;
        this.peer.setMessageSizeLimit(5 * 1024 * 1024);
        // Add message listener
        this.peer.onmessage = (message, label, peer) => this.handleNewMessage(message, peer);
      });
  }

  init() {
    // Init peer and register it to the signaling server
    return this.createPeer()
      .then(() => {
        // Client
        this.socksToRTC = new SocksToRTC(this.peer, this.socksProxy, this.peersUrl);
        this.clientQueue = MultiplexedQueue(
          'client',
          ({ msg }) => this.socksToRTC.handleClientMessage(msg),
        );

        // Relay
        this.rtcRelay = new RTCRelay(this.peer);
        this.relayQueue = MultiplexedQueue(
          'relay',
          ({ msg, message, peer }) =>
            this.rtcRelay.handleRelayMessage(
              message,     /* Original message */
              msg,         /* Decrypted message */
              peer),       /* Sender */
        );

        // Exit
        this.rtcToNet = new RTCToNet(this.policy, this.peer);
        this.exitQueue = MultiplexedQueue(
          'exit',
          ({ msg, peer }) =>
            this.rtcToNet.handleExitMessage(
              msg,          /* Decrypted message */
              peer,         /* Sender */
              this.ppk[1]), /* Private key of current peer */
        );

        // All messages
        this.messages = MessageQueue(
          'all',
          ({ message, peer }) => {
            // Get real size of the message as received
            const dataIn = message.length;

            return decryptPayload(message, this.ppk[1])
              .then((msg) => {
                // Every message must have these fields defined
                const connectionID = msg.connectionID;
                const role = msg.role;
                const data = {
                  msg,
                  message,
                  peer,
                };

                // Push in corresponding message queue
                if (role === 'exit') {
                  this.rtcToNet.dataIn += dataIn;
                  this.exitQueue.push(connectionID, data);
                } else if (role === 'relay') {
                  if (msg.nextPeer || this.rtcRelay.isOpenedConnection(connectionID, peer)) {
                    this.rtcRelay.dataIn += dataIn;
                    this.relayQueue.push(connectionID, data);
                  } else if (this.socksToRTC.isOpenedConnection(connectionID, peer)) {
                    this.clientQueue.push(connectionID, data);
                  } else {
                    // Drop message as it might belong to a closed connection
                    // This happens normally when the client closed the TCP
                    // socket and the exit node did the same, in this case the
                    // client will still receive a message from the exit node
                    // saying that the connection has been closed. It's safe to
                    // ignore it.
                    logger.debug(`peer drops ${JSON.stringify(data)}`);
                  }
                }
              }).catch(ex => logger.error(`proxy-peer error: ${ex} ${ex.stack}`));
          }
        );
      });
  }

  getSocksProxyHost() {
    return this.socksProxy.getHost();
  }

  getSocksProxyPort() {
    return this.socksProxy.getPort();
  }

  unload() {
    // Unload multiplexed message queues
    [this.clientQueue, this.relayQueue, this.exitQueue].forEach((queue) => {
      if (queue !== null) {
        queue.unload();
      }
    });

    // Unload client, relay and exit
    [this.socksToRTC, this.rtcRelay, this.rtcToNet].forEach((node) => {
      if (node !== null) {
        node.unload();
      }
    });

    this.socksProxy.unload();
    this.peer.destroy();
    this.peer = null;
  }

  handleNewMessage(message, peer) {
    this.messages.push({ message, peer });
  }
}
