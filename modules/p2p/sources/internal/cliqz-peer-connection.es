/* eslint no-param-reassign: off */

import random from '../../core/crypto/random';
import constants from './constants';

// CliqzPeerConnection: encapsulates a RTCDataChannel and RTCPeerConnection
// TODO: everything that changes CliqzPeerConnection state should be done
// here (adding ice candidates, offers, etc)
export default class CliqzPeerConnection {
  // Maximum wait time for receiving a 'pong' from another peer when we
  // send it a 'ping', in health check.
  get healthCheckTimeout() {
    return this.cliqzPeer.healthCheckTimeout;
  }

  // Maximum wait time for a connection to be established
  get newConnectionTimeout() {
    return this.cliqzPeer.newConnectionTimeout;
  }

  constructor(cliqzPeer, peerOptions, peer, isLocal) {
    this.logDebug = cliqzPeer.logDebug.bind(null, `[${peer}]`);
    this.log = cliqzPeer.log.bind(null, `[${peer}]`);
    this.logError = cliqzPeer.logError.bind(null, `[${peer}]`);
    this.id = Math.round(random() * 2000000000);
    this.remoteId = null;
    this.cliqzPeer = cliqzPeer;
    this.peerOptions = peerOptions;
    this.peer = peer;
    this.isLocal = isLocal;
    let connection;
    try {
      connection = new this.cliqzPeer.RTCPeerConnection(this.peerOptions);
    } catch (e) {
      this.logError('Error creating RTCPeerConnection', e);
      this.close('error constructor');
      return;
    }
    this.connection = connection;
    this.channel = null;
    this.status = 'initial'; // initial|nosuchroute|signaling|open|closed
    if (isLocal) {
      try {
        this.channel = this.connection.createDataChannel('data', { ordered: cliqzPeer.ordered });
      } catch (e) {
        this.logError('Error creating data channel', e);
        this.close('error create data channel');
        return;
      }
      this._configureChannel();
    }
    this.connection.onicecandidate = (e) => {
      if (connection === this.connection) {
        this.logDebug('Sending candidate', e.candidate);
        // Tell other side about my candidate
        cliqzPeer._sendSignaling(this.peer, { type: 'ice', candidate: JSON.stringify(e.candidate) }, this.id);
      } else {
        this.logError('ERROR: received onicecandidate message from old PeerConnection');
      }
    };
    // TODO: if remote, should we send a initial message to indicate the remote channel is open?
    this.connection.ondatachannel = (e) => {
      if (connection === this.connection) {
        // TODO: check if there is already one channel?
        this.channel = e.channel;
        this._configureChannel();
      } else {
        this.logError('ERROR: received ondatachannel message from old PeerConnection');
      }
    };

    this.connection.onerror = (e) => {
      if (connection === this.connection) {
        this.logError(e, 'Connection error');
        this.close('connection.onerror');
      } else {
        this.logError('ERROR: received onerror message from old PeerConnection');
      }
    };

    // this.connection.oniceconnectionstatechange = () => {
    //   if (connection === this.connection) {
    //     const state = this.connection.iceconnectionstate;
    //     if (state === 'failed' || state === 'closed') {
    //       this.log('Failed ice connection');
    //       this.close();
    //     }
    //   }
    // };

    cliqzPeer.setTimeout(() => {
      if (this.status !== 'open') {
        this.close('timeout');
      }
    }, this.newConnectionTimeout);

    // Events
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
  }

  getStats() {
    function _getStats(conn, cb) {
      conn.getStats((res) => {
        const items = [];
        res.result().forEach((result) => {
          const item = {};
          result.names().forEach((name) => {
            item[name] = result.stat(name);
          });
          item.id = result.id;
          item.type = result.type;
          item.timestamp = result.timestamp;
          items.push(item);
        });
        cb(items);
      });
    }
    return new Promise((resolve, reject) => {
      try {
        _getStats(this.connection, stats => resolve(stats));
      } catch (e) {
        reject(e);
      }
    });
  }

  isRelayed() {
    return this.getCandidatesInfo()
      .then(x => x.localCandidateType === 'relayed' || x.remoteCandidateType === 'relayed');
  }

  getCandidatesInfo() {
    const window = this.cliqzPeer.window;
    // FF
    // FIXME: not all windows in FF seem to have WebrtcGlobalInformation,
    // probably only privileged ones like ChromeWindow.
    // need to find a workaround for this.
    if (window.WebrtcGlobalInformation) {
      return new Promise((resolve, reject) => {
        window.WebrtcGlobalInformation.getAllStats((stats) => {
          if (!stats) {
            return reject('no stats');
          }
          const reports = stats.reports;
          if (!reports) {
            return reject('no reports');
          }
          const conn = reports.find(x => x.pcid === this.connection.id);
          if (!conn) {
            return reject('no conn');
          }
          const pairs = conn.iceCandidatePairStats.filter(x => x.selected);
          if (pairs.length === 0) {
            return reject('no candidate pairs');
          } else if (pairs.length > 1) {
            return reject('more than one candidate pair');
          }
          const localCandidate = conn.iceCandidateStats.find(x =>
            x.type.indexOf('local') === 0 && x.id === pairs[0].localCandidateId
          );
          const remoteCandidate = conn.iceCandidateStats.find(x =>
            x.type.indexOf('remote') === 0 && x.id === pairs[0].remoteCandidateId
          );
          if (!localCandidate) {
            return reject('no local candidate');
          }
          if (!remoteCandidate) {
            return reject('no remote candidate');
          }
          return resolve({
            localPeer: this.cliqzPeer.peerID,
            remotePeer: this.peer,
            timestamp: Math.floor(pairs[0].timestamp / 1000),
            localCandidateType: localCandidate.candidateType,
            localIp: localCandidate.ipAddress,
            localPort: localCandidate.portNumber,
            remoteCandidateType: remoteCandidate.candidateType,
            remoteIp: remoteCandidate.ipAddress,
            remotePort: remoteCandidate.portNumber,
          });
        });
      });
    }
    // Chrome/WebView/NodeJS
    return this.getStats()
      .then((stats) => {
        if (!stats) {
          throw new Error('no stats');
        }
        const pairs = stats.filter(x => x.type === 'googCandidatePair' && x.googActiveConnection === 'true');
        if (pairs.length === 0) {
          throw new Error('no candidate pairs');
        } else if (pairs.length > 1) {
          throw new Error('more than one candidate pair');
        }
        const localCandidate = stats.find(x => x.type === 'localcandidate' && x.id === pairs[0].localCandidateId);
        const remoteCandidate = stats.find(x => x.type === 'remotecandidate' && x.id === pairs[0].remoteCandidateId);
        if (!localCandidate) {
          throw new Error('no local candidate');
        }
        if (!remoteCandidate) {
          throw new Error('no remote candidate');
        }
        return {
          localPeer: this.cliqzPeer.peerID,
          remotePeer: this.peer,
          timestamp: Math.floor(pairs[0].timestamp.getTime() / 1000),
          localCandidateType: localCandidate.candidateType,
          localIp: localCandidate.ipAddress,
          localPort: localCandidate.portNumber,
          remoteCandidateType: remoteCandidate.candidateType,
          remoteIp: remoteCandidate.ipAddress,
          remotePort: remoteCandidate.portNumber,
        };
      });
  }

  createOffer() {
    const connection = this.connection;
    connection.createOffer((description) => {
      this.logDebug('Created offer', description);
      connection.setLocalDescription(new this.cliqzPeer.RTCSessionDescription(description), () => {
        this.cliqzPeer._sendSignaling(this.peer, { type: 'offer', description }, this.id);
      }, (error) => {
        this.logError(error, 'create offer error');
        this.close('create offer error');
      });
    }, (error) => {
      this.logError(error, 'offer error');
      this.close('offer error');
    });
  }

  receiveICECandidate(candidate, id) {
    const from = this.peer;
    const connection = this.connection;
    if (connection && connection.remoteDescription) {
      if (!this.remoteId || this.remoteId === id) {
        if (candidate) {
          this.logDebug('Received candidate', from, candidate, id, this.remoteId);
          this.remoteId = id;
          connection.addIceCandidate(new this.cliqzPeer.RTCIceCandidate(candidate), () => {
            this.logDebug('candidate ok', candidate);
          }, (e) => {
            this.logError(e, 'candidate wrong', candidate);
          });
        } else {
          // TODO: should we do sth here? Chromium and Firefox seem to handle this differently...
          this.logDebug('Received end of candidates', from, candidate, id, this.remoteId);
        }
      } else {
        this.logDebug('Warning: wrong ice candidate received', from, id, this.remoteId);
      }
    } else {
      if (!this.savedICECandidates) {
        this.savedICECandidates = [];
      }
      this.savedICECandidates.push([candidate, id]);
    }
  }

  receiveOffer(offer, id) {
    const from = this.peer;
    // TODO: Does it really make sense to receive two offers from same id?
    if (!this.remoteId || this.remoteId === id) {
      this.logDebug('Received offer', offer.description, from, offer, id, this.remoteId);
      this.remoteId = id;
      const connection = this.connection;
      const description = new this.cliqzPeer.RTCSessionDescription(offer.description);
      connection.setRemoteDescription(description, () => {
        (this.savedICECandidates || []).forEach(([candidate, _id]) => {
          this.receiveICECandidate(candidate, _id);
        });
        connection.createAnswer((answer) => {
          connection.setLocalDescription(answer, () => {
            this.cliqzPeer._sendSignaling(from, { type: 'answer', description: answer }, this.id);
          }, (error) => {
            this.logError(error, 'error setting receiver local description');
          });
        }, (error) => {
          this.logError(error, 'error creating answer');
        });
      }, (error) => {
        this.logError(error, 'error setting receiver remote description');
      });
    } else {
      this.logDebug('Warning: wrong offer received', from, id, this.remoteId);
    }
  }

  receiveAnswer(answer, id) {
    if (!this.remoteId || this.remoteId === id) {
      const from = this.peer;
      this.logDebug('Received answer', answer.description, from, answer, id, this.remoteId);
      this.remoteId = id;
      const connection = this.connection;
      const description = new this.cliqzPeer.RTCSessionDescription(answer.description);
      connection.setRemoteDescription(description, () => {
        (this.savedICECandidates || []).forEach(([candidate, _id]) => {
          this.receiveICECandidate(candidate, _id);
        });
        this.logDebug('set originator remote description');
      }, (error) => {
        this.logError(error, 'error setting originator remote description');
      });
    }
  }

  noSuchRoute(id) {
    if (id === this.id) {
      this.logDebug('No such route', id, this.peer);
      this.status = 'nosuchroute';
      this.close('nosuchroute');
    } else {
      this.logDebug('Discarding no such route error', id, this.id);
    }
  }

  close(noPropagate) {
    if (this.status !== 'closed') {
      if (typeof noPropagate === 'string') {
        const why = noPropagate;
        noPropagate = false;
        this.logDebug('Closing:', why);
      } else {
        this.logDebug('Closing other:', noPropagate);
      }
      const oldStatus = this.status;
      this.status = 'closed';
      this.closeChannel();
      this.closeConnection();
      if (this.onclose && !noPropagate) {
        try {
          this.onclose(oldStatus);
        } catch (e) {
          this.logError(typeof e === 'string' ? e : e.message, 'error calling cliqzpeerconnection onclose');
        }
      }

      // Events
      this.onopen = null;
      this.onclose = null;
      this.onmessage = null;
    }
  }

  send(data) {
    // TODO: check other possible channel states where we cannot send
    if (this.status === 'open') {
      try {
        this.channel.send(data);
      } catch (e) {
        this.logError(typeof e === 'string' ? e : e.message, 'error sending');
        this.close('error send');
      }
    } else {
      this.logError('cannot send: connection is not open', 'ERROR');
    }
  }

  // A health check for the connection, the returned promise will be resolve if healthy,
  // and reject (and close connection) otherwise.
  healthCheck() {
    if (!this.healthCheckPromise) {
      this.healthCheckPromise = new Promise((resolve, reject) => {
        this.healthCheckResolver = resolve;
        try {
          this.channel.send(new Uint8Array([constants.PING_MSG_TYPE]));
        } catch (e) {
          // Nothing
        }
        this.cliqzPeer.setTimeout(() => {
          reject();
        }, this.healthCheckTimeout);
      });
      this.healthCheckPromise
      .catch(() => {
        this.close('healthCheck');
      })
      .then(() => {
        this.healthCheckPromise = null;
        this.healthCheckResolver = null;
      });
    }
    return this.healthCheckPromise;
  }

  _configureChannel() {
    const channel = this.channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      this.status = 'open';
      if (this.onopen) {
        try {
          this.onopen();
        } catch (e) {
          this.logError(typeof e === 'string' ? e : e.message, 'error calling cliqzpeerconnection onopen');
        }
      }
    };
    channel.onclose = () => {
      this.logDebug('channel closed');
      this.close('channel.onclose');
    };
    channel.onmessage = (message) => {
      if (this.onmessage) {
        this.onmessage(message.data);
      }
    };
    channel.onerror = (e) => {
      this.logError(e, 'channel error');
      this.close('channel error');
    };
  }

  closeChannel() {
    if (this.channel) {
      const channel = this.channel;
      channel.onopen = null;
      channel.onclose = null;
      channel.onmessage = null;
      channel.onerror = null;
      try {
        channel.close();
      } catch (e) {
        this.logError('Error closing channel', e);
      }
      this.channel = null;
    }
  }

  closeConnection() {
    if (this.connection) {
      const connection = this.connection;
      connection.onicecandidate = null;
      connection.ondatachannel = null;
      connection.onerror = null;
      try {
        connection.close();
      } catch (e) {
        this.logError('Error closing connection', e);
      }
      this.connection = null;
    }
  }
}
