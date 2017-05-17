// import md5 from 'core/helpers/md5';
import { utils } from '../core/cliqz';
import console from './console';


function hashConnectionID(connectionID /* , peerID */) {
  // TODO: Remove this after debug
  return connectionID;
  // return md5(peerID.concat('::::').concat(connectionID));
}


export default class {
  constructor() {
    this.previousPeer = new Map();

    // Keep some statistics
    this.receivedMessages = 0;
    this.droppedMessages = 0;
    this.dataIn = 0;
    this.dataOut = 0;

    // Display health check
    this.healthCheck = utils.setInterval(
      () => {
        console.debug(`proxyPeer RTCRelay healthcheck ${JSON.stringify(this.healthcheck())}`);
      },
      60 * 1000);

    // Clean-up dead connections (no activity for one minute)
    this.closeDeadConnections = utils.setInterval(
      () => {
        const timestamp = Date.now();
        [...this.previousPeer.keys()].forEach((connectionID) => {
          const { lastActivity } = this.previousPeer.get(connectionID);
          if (lastActivity < (timestamp - (1000 * 60))) {
            console.debug(`proxyPeer RELAY ${connectionID} garbage collect`);
            this.previousPeer.delete(connectionID);
          }
        });
      },
      10 * 1000);
  }

  healthcheck() {
    return {
      receivedMessages: this.receivedMessages,
      droppedMessages: this.droppedMessages,
      dataIn: this.dataIn,
      dataOut: this.dataOut,
      currentOpenedConnections: this.previousPeer.size,
    };
  }

  stop() {
    utils.clearInterval(this.closeDeadConnections);
    utils.clearInterval(this.healthCheck);
  }

  isOpenedConnection(connectionID, sender) {
    return this.previousPeer.has(hashConnectionID(connectionID, sender));
  }

  handleRelayMessage(data, message, peer, sender) {
    try {
      this.receivedMessages += 1;
      this.dataIn += data.length;

      if (message.nextPeer) {
        return this.relay(message, peer, sender);
      }

      return this.relayBackward(
        data,
        peer,
        sender,
        message.connectionID,
        message.messageNumber,
      );
    } catch (ex) {
      return Promise.reject(ex);
    }
  }

  relayBackward(data, peer, sender, connectionID, messageNumber) {
    const connectionHash = hashConnectionID(connectionID, sender);
    if (this.previousPeer.has(connectionHash)) {
      const previousPeer = this.previousPeer.get(connectionHash);
      previousPeer.lastActivity = Date.now();

      console.debug(`proxyPeer RELAY ${connectionID} ${messageNumber} backward ${data.length}`);

      this.dataOut += data.length;
      return peer.send(previousPeer.sender, data, 'antitracking')
        .catch((e) => {
          console.error(`proxyPeer RELAY ${connectionID} ${messageNumber} ERROR: could not send message ${e}`);
        });
    }

    // Drop message because connection doesn't exist
    console.debug(`proxyPeer RELAY ${connectionID} ${messageNumber} dropped message`);
    this.droppedMessages += 1;
    return Promise.resolve();
  }

  /* Act as a relay, unwrap one layer of the onion package and forward
   * it to next node.
   */
  relay(message, peer, sender) {
    const nextPeer = message.nextPeer;
    const nextData = message.data;
    const connectionID = message.connectionID;

    console.debug(`proxyPeer RELAY ${connectionID} ${message.messageNumber} forward ${nextData.length}`);

    // Remember where the query came from
    this.previousPeer.set(
      hashConnectionID(message.connectionID, nextPeer),
      { sender, lastActivity: Date.now() });

    // Sends payload to the next peer
    this.dataOut += nextData.length;
    return peer.send(nextPeer, nextData, 'antitracking')
      .catch((e) => {
        console.error(`proxyPeer RELAY ${connectionID} ${message.messageNumber} ERROR: could not send message ${e}`);
      });
  }
}
