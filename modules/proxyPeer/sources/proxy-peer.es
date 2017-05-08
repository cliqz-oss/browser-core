import { fetch, Request } from '../core/http';
import { utils } from '../core/cliqz';

import CliqzPeer from '../p2p/cliqz-peer';
import { createHiddenWindow, destroyHiddenWindow } from '../p2p/utils';

import console from './console';
import MessageQueue from './message-queue';
import SocksProxy from './socks-proxy';
import RTCRelay from './rtc-relay';
import RTCToNet from './rtc-to-net';
import SocksToRTC from './socks-to-rtc';
import { decryptPayload } from './rtc-onion';


/**
 * Wrap a MessageQueue into a multiplexer. It exposes a different `push`
 * function, with an extra argument `key`. For each different value of key,
 * a different queue is created.
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
          console.debug(`proxyPeer ${name}_${key} garbage collect`);
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


function post(url, payload) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const request = new Request(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload) });
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
}


export default class {
  constructor() {
    // Create a socks proxy
    this.socksProxy = new SocksProxy();
    this.peer = null;
    this.ppk = null;

    this.socksToRTC = null;
    this.rtcRelay = null;
    this.rtcToNet = null;

    this.signalingURL = 'p2p-signaling-102182689.us-east-1.elb.amazonaws.com:9666';
  }

  createPeer(window) {
    return CliqzPeer.generateKeypair()
      .then((ppk) => { this.ppk = ppk; })
      .then(() => {
        this.peer = new CliqzPeer(window, this.ppk, {
          ordered: true,
          brokerUrl: `ws://${this.signalingURL}`,
          maxReconnections: 0,
          maxMessageRetries: 0,
        });

        // Add message listener
        this.peer.onmessage = (message, label, peer) => this.handleNewMessage(message, peer);
      })
      .then(() => this.peer.createConnection())
      .then(() => post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
        pk: this.ppk[0],
        name: this.peer.peerID,
        ver: '0.6',
      }))
      .then(() => this.peer.socket.close())
      .then(() => post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
        name: this.peer.peerID,
        ver: '0.6',
      }));
  }

  init() {
    // Init peer and register it to the signaling server
    return createHiddenWindow()
      .then(window => this.createPeer(window))
      .then(() => {
        // Client
        this.socksToRTC = new SocksToRTC(this.peer, this.socksProxy);
        this.clientQueue = MultiplexedQueue(
          'client',
          ({ msg }) => this.socksToRTC.handleClientMessage(msg),
        );

        // Relay
        this.rtcRelay = new RTCRelay();
        this.relayQueue = MultiplexedQueue(
          'relay',
          ({ msg, message, peer }) =>
          this.rtcRelay.handleRelayMessage(
            message,     /* Original message */
            msg,         /* Decrypted message */
            this.peer,   /* Current peer */
            peer),       /* Sender */
        );

        // Exit
        this.rtcToNet = new RTCToNet();
        this.exitQueue = MultiplexedQueue(
          'exit',
          ({ msg, peer }) =>
          this.rtcToNet.handleExitMessage(
            msg,          /* Decrypted message */
            this.peer,    /* Current peer */
            peer,         /* Sender */
            this.ppk[1]), /* Private key of current peer */
        );

        // All messages
        this.messages = MessageQueue(
          'all',
          ({ message, peer }) =>
          decryptPayload(message, this.ppk[1])
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
              this.exitQueue.push(connectionID, data);
            } else if (role === 'relay') {
              if (msg.nextPeer || this.rtcRelay.isOpenedConnection(connectionID, peer)) {
                this.relayQueue.push(connectionID, data);
              } else {
                this.clientQueue.push(connectionID, data);
              }
            }
          })
          .catch(ex => console.error(`proxyPeer ProxyPeer error: ${ex} ${ex.stack}`)),
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
    [this.socksToRTC, this.rtcRelay, this.rtcToNet].forEach((queue) => {
      if (queue !== null) {
        queue.unload();
      }
    });

    this.socksProxy.unload();
    this.peer.disableSignaling();
    this.peer.destroy();
    destroyHiddenWindow();
    this.peer = null;
  }

  handleNewMessage(message, peer) {
    this.messages.push({ message, peer });
  }
}
