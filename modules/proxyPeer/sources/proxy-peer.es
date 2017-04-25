import { fetch, Request } from 'core/http';
import console from 'core/console';

import CliqzPeer from 'p2p/cliqz-peer';
import { createHiddenWindow, destroyHiddenWindow } from 'p2p/utils';

import MessageQueue from 'proxyPeer/message-queue';
import SocksProxy from 'proxyPeer/socks-proxy';
import RTCRelay from 'proxyPeer/rtc-relay';
import RTCToNet from 'proxyPeer/rtc-to-net';
import SocksToRTC from 'proxyPeer/socks-to-rtc';
import { decryptPayload } from 'proxyPeer/rtc-onion';


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

    // Create a WebRTC hidden window
    createHiddenWindow()
      .then(window => CliqzPeer.generateKeypair().then((ppk) => {
        this.peer = new CliqzPeer(window, ppk, {
          ordered: true,
          brokerUrl: 'ws://p2p-signaling-102182689.us-east-1.elb.amazonaws.com:9666',
          maxReconnections: 0,
          maxMessageRetries: 0,
        });

        // Add message listener
        this.peer.onmessage = (message, label, peer) => this.handleNewMessage(message, peer);

        // Register proxy peer
        this.peer.createConnection().then(() =>
          post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
            pk: ppk[0],
            name: this.peer.peerID,
            ver: '0.6',
          }).then(() => {
            this.peer.socket.close();
            return post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
              name: this.peer.peerID,
              ver: '0.6',
            });
          }).then(() => {
            // Client
            this.socksToRTC = new SocksToRTC(this.peer, this.socksProxy);
            this.clientQueue = MessageQueue(
              'client',
              ({ msg }) => this.socksToRTC.handleClientMessage(msg),
            );

            // Relay
            this.rtcRelay = new RTCRelay();
            this.relayQueue = MessageQueue(
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
            this.exitQueue = MessageQueue(
              'exit',
              ({ msg, peer }) =>
                this.rtcToNet.handleExitMessage(
                  msg,          /* Decrypted message */
                  this.peer,    /* Current peer */
                  peer,         /* Sender */
                  ppk[1]), /* Private key of current peer */
            );

            // All messages
            this.messages = MessageQueue(
              'all',
              ({ message, peer }) =>
                decryptPayload(message, ppk[1])
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
                      this.exitQueue.push(data);
                    } else if (role === 'relay') {
                      if (msg.nextPeer || this.rtcRelay.isOpenedConnection(connectionID, peer)) {
                        this.relayQueue.push(data);
                      } else {
                        this.clientQueue.push(data);
                      }
                    }
                  })
                  .catch(ex => console.debug(`proxyPeer ProxyPeer error: ${ex}`)),
            );
          }),
        );
      }));
  }

  getSocksProxyHost() {
    return this.socksProxy.getHost();
  }

  getSocksProxyPort() {
    return this.socksProxy.getPort();
  }

  unload() {
    this.socksProxy.unload();
    return destroyHiddenWindow();
  }

  handleNewMessage(message, peer) {
    this.messages.push({ message, peer });
  }
}
