import constants from './constants';

// CliqzPeerConnection: encapsulates a RTCDataChannel and RTCPeerConnection
// TODO: everything that changes CliqzPeerConnection state should be done
// here (adding ice candidates, offers, etc)
export default class CliqzPeerConnection {
  constructor(cliqzPeer, peerOptions, peer, isLocal) {
    this.log = cliqzPeer.log;
    this.logDebug = cliqzPeer.logDebug;
    this.id = Math.round(Math.random() * 2000000000);
    this.remoteId = null;
    this.cliqzPeer = cliqzPeer;
    this.peerOptions = peerOptions;
    this.peer = peer;
    this.isLocal = isLocal;
    let connection;
    try {
      connection = new this.cliqzPeer.RTCPeerConnection(this.peerOptions);
    } catch (e) {
      this.log('Error creating RTCPeerConnection', e);
      this.close();
      return;
    }
    this.connection = connection;
    this.channel = null;
    this.status = 'initial'; // initial|nosuchroute|signaling|open|closed
    if (isLocal) {
      try {
        this.channel = this.connection.createDataChannel('data', { ordered: cliqzPeer.ordered });
      } catch (e) {
        this.log('Error creating data channel', e);
        this.close();
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
        this.log('ERROR: received onicecandidate message from old PeerConnection');
      }
    };
    // TODO: if remote, should we send a initial message to indicate the remote channel is open?
    this.connection.ondatachannel = (e) => {
      if (connection === this.connection) {
        // TODO: check if there is already one channel?
        this.channel = e.channel;
        this._configureChannel();
      } else {
        this.log('ERROR: received ondatachannel message from old PeerConnection');
      }
    };

    this.connection.onerror = (e) => {
      if (connection === this.connection) {
        this.log(e, 'Connection error');
        this.close();
      } else {
        this.log('ERROR: received onerror message from old PeerConnection');
      }
    };

    this.ticks = 0;
    cliqzPeer.setTimeout(() => { // 5 seconds timeout for establishing connection
      if (this.status !== 'open') {
        this.close();
      }
    }, 5000); // TODO: configurable?

    this.pongPromises = [];

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
          const localCandidate = conn.iceCandidateStats.find(x => x.type === 'localcandidate' && x.id === pairs[0].localCandidateId);
          const remoteCandidate = conn.iceCandidateStats.find(x => x.type === 'remotecandidate' && x.id === pairs[0].remoteCandidateId);
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
        this.log(error, 'create offer error');
        this.close();
      });
    }, (error) => {
      this.log(error, 'offer error');
      this.close();
    });
  }

  receiveICECandidate(candidate, id) {
    const from = this.peer;
    if (!this.remoteId || this.remoteId === id) {
      this.logDebug('Received candidate', from, candidate, id, this.remoteId);
      this.remoteId = id;
          // TODO: handle errors, bad states
      const connection = this.connection;
          // TODO:handle state change?
      connection.addIceCandidate(new this.cliqzPeer.RTCIceCandidate(candidate), () => {
        this.logDebug('candidate ok');
      }, (e) => {
        this.log(e, 'candidate wrong');
      });
    } else {
      this.log('Warning: wrong ice candidate received', from, id, this.remoteId);
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
        connection.createAnswer((answer) => {
          connection.setLocalDescription(answer, () => {
            this.cliqzPeer._sendSignaling(from, { type: 'answer', description: answer }, this.id);
          }, (error) => {
            this.log(error, 'error setting receiver local description');
          });
        }, (error) => {
          this.log(error, 'error creating answer');
        });
      }, (error) => {
        this.log(error, 'error setting receiver remote description');
      });
    } else {
      this.log('Warning: wrong offer received', from, id, this.remoteId);
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
        this.logDebug('set originator remote description');
      }, (error) => {
        this.log(error, 'error setting originator remote description');
      });
    }
  }

  noSuchRoute(id) {
    if (id === this.id) {
      this.logDebug('No such route', id, this.peer);
      this.status = 'nosuchroute';
      this.close();
    } else {
      this.logDebug('Discarding no such route error', id, this.id);
    }
  }

  close(noPropagate) {
    if (this.status !== 'closed') {
      const oldStatus = this.status;
      this.status = 'closed';
      this.closeChannel();
      this.closeConnection();
      if (this.scheduledPacemaker) {
        this.cliqzPeer.clearInterval(this.scheduledPacemaker);
        this.scheduledPacemaker = null;
      }
      if (this.onclose && !noPropagate) {
        try {
          this.onclose(oldStatus);
        } catch (e) {
          this.log(typeof e === 'string' ? e : e.message, 'error calling cliqzpeerconnection onclose');
        }
      }

      // Events
      this.onopen = null;
      this.onclose = null;
      this.onmessage = null;
    }
  }

  pacemaker() {
    this.ticks += 1;
    if (this.cliqzPeer.pingInterval && this.ticks % this.cliqzPeer.pingInterval === 0) {
      this.healthCheck();
    }
  }


  send(data) {
    // TODO: check other possible channel states where we cannot send
    if (this.status === 'open') {
      try {
        this.channel.send(data);
      } catch (e) {
        this.log(typeof e === 'string' ? e : e.message, 'error sending');
        this.close();
      }
    } else {
      this.log('cannot send: connection is not open', 'ERROR');
    }
  }

  // A health check for the connection, the returned promise will be resolve if healthy,
  // and reject (and close connection) otherwise.
  healthCheck() {
    return new Promise((resolve, reject) => {
      this.pongPromises.push(resolve);
      try {
        this.channel.send(new Uint8Array([constants.PING_MSG_TYPE]));
      } catch (e) {
        // Nothing
      }
      this.cliqzPeer.setTimeout(() => {
        const idx = this.pongPromises.indexOf(resolve);
        if (idx >= 0) {
          this.pongPromises.splice(idx, 1);
          this.close();
          reject('connection not healthy, closing...');
        }
      }, 3000); // TODO: make configurable
    });
  }

  _configureChannel() {
    const channel = this.channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      this.status = 'open';
      this.scheduledPacemaker = this.cliqzPeer.setInterval(() => this.pacemaker(), 1000);
      if (this.onopen) {
        try {
          this.onopen();
        } catch (e) {
          this.log(typeof e === 'string' ? e : e.message, 'error calling cliqzpeerconnection onopen');
        }
      }
    };
    channel.onclose = () => {
      this.logDebug('channel closed');
      this.close();
    };
    channel.onmessage = (message) => {
      if (this.onmessage) {
        this.onmessage(message.data);
      }
    };
    channel.onerror = (e) => {
      this.log(e, 'channel error');
      this.close();
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
        this.log('Error closing channel', e);
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
        this.log('Error closing connection', e);
      }
      this.connection = null;
    }
  }
}
