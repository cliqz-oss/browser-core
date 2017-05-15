// import md5 from 'core/helpers/md5';
import { utils } from '../core/cliqz';
import logger from './logger';
import { ERROR_CODE } from './rtc-onion';


function hashConnectionID(connectionID /* , peerID */) {
  // TODO: Remove this after debug
  return connectionID;
  // return md5(peerID.concat('::::').concat(connectionID));
}


export default class {
  constructor(peer) {
    this.peer = peer;
    this.previousPeer = new Map();

    // Keep some statistics
    this.receivedMessages = 0;
    this.droppedMessages = 0;

    // Stats about data received
    this.dataIn = 0;  // Updated in proxy-peer.es
    this.dataOut = 0;

    // Display health check
    this.healthCheck = utils.setInterval(
      () => {
        logger.log(`RTCRelay healthcheck ${JSON.stringify(this.healthcheck())}`);
      },
      60 * 1000);

    // Clean-up dead connections (no activity for one minute)
    this.closeDeadConnections = utils.setInterval(
      () => {
        const timestamp = Date.now();
        [...this.previousPeer.keys()].forEach((connectionID) => {
          const { lastActivity, sender } = this.previousPeer.get(connectionID);
          if (lastActivity < (timestamp - (1000 * 15))) {
            logger.debug(`RELAY ${connectionID} garbage collect`);
            this.previousPeer.delete(connectionID);

            // Signal to the client that the connection has been garbage
            // collected.
            this.signalClosedConnectionToClient(
              connectionID,
              sender,
              ERROR_CODE.RELAY_CONNECTION_GARBAGE_COLLECTED
            );
          }
        });
      },
      10 * 1000);
  }

  healthcheck() {
    return {
      receivedMessages: this.receivedMessages,
      droppedMessages: this.droppedMessages,
      dataIn: `${(this.dataIn / 1048576).toFixed(2)} MB`,
      dataOut: `${(this.dataOut / 1048576).toFixed(2)} MB`,
      currentOpenedConnections: this.previousPeer.size,
    };
  }

  stop() {
    utils.clearInterval(this.closeDeadConnections);
    utils.clearInterval(this.healthCheck);
  }

  unload() {
    this.stop();
  }

  isOpenedConnection(connectionID, sender) {
    return this.previousPeer.has(hashConnectionID(connectionID, sender));
  }

  handleRelayMessage(data, message, sender) {
    try {
      this.receivedMessages += 1;

      if (message.nextPeer) {
        return this.relay(message, this.peer, sender);
      }

      return this.relayBackward(
        data,
        this.peer,
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

      logger.debug(`RELAY ${connectionID} ${messageNumber} backward ${data.length}`);

      this.dataOut += data.length;
      return peer.send(previousPeer.sender, data, 'antitracking')
        .catch((e) => {
          // We were not able to contact the client
          logger.error(`RELAY ${connectionID} ${messageNumber} ERROR: could not send message ${e}`);
        });
    }

    // Drop message because connection doesn't exist anymore
    logger.error(`RELAY ${connectionID} ${messageNumber} dropped message`);
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

    logger.debug(`RELAY ${connectionID} ${message.messageNumber} forward ${nextData.length}`);

    // Remember where the query came from
    this.previousPeer.set(
      hashConnectionID(message.connectionID, nextPeer),
      {
        sender,
        lastActivity: Date.now()
      });

    // Sends payload to the next peer
    this.dataOut += nextData.length;
    return peer.send(nextPeer, nextData, 'antitracking')
      .catch((e) => {
        logger.error(`RELAY ${connectionID} ${message.messageNumber} ERROR: could not send message ${e}`);
        // We were not able to connect to the next node, so we relay backward an
        // error message so that the client can close the connection as soon as
        // possible.
        return this.signalClosedConnectionToClient(
          connectionID,
          sender,
          ERROR_CODE.RELAY_CANNOT_CONNECT_TO_EXIT);
      });
  }


  signalClosedConnectionToClient(connectionID, sender, error) {
    const payload = JSON.stringify({
      connectionID,
      error,
      role: 'relay',
    });

    // Send back response to the client. Note that this is not encrypted, as
    // there is not much information here.
    return this.peer.send(sender, payload, 'antitracking');
  }
}
