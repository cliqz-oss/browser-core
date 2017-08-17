/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */

import random from '../../core/crypto/random';
import { toUTF8, fromUTF8 } from '../../core/encoding';
import constants from './constants';
import { isArrayBuffer } from './utils';


function putInt(data, offset, num) {
  data[offset] = num >> 24;
  data[offset + 1] = (num >> 16) & 0xFF;
  data[offset + 2] = (num >> 8) & 0xFF;
  data[offset + 3] = num & 0xFF;
}

function getInt(data, offset) {
  return (data[offset] << 24) | (data[offset + 1] << 16) |
    (data[offset + 2] << 8) | data[offset + 3];
}

function putWord(data, offset, num) {
  data[offset] = num >> 8;
  data[offset + 1] = num & 0xFF;
}

function getWord(data, offset) {
  return (data[offset] << 8) | data[offset + 1];
}

// Aux
function decodeMessage(buffer) {
  let data = new Uint8Array(buffer);
  const type = data[0];
  const labelSize = data[1];
  const label = fromUTF8(data.subarray(2, 2 + labelSize));
  if (type & constants.JSON_MSG_FLAG) {
    data = JSON.parse(fromUTF8(data.subarray(2 + labelSize)));
  } else {
    data = data.slice(2 + labelSize);
  }
  return {
    data,
    label,
  };
}

function encodeAck(msgId, chunkId) {
  const output = new Uint8Array(7);
  output[0] = constants.ACK_MSG_TYPE;
  putInt(output, 1, msgId);
  putWord(output, 5, chunkId);
  return output.buffer;
}

function encodeMessage(data, label) {
  label = toUTF8(label);
  if (label.byteLength > 255) {
    throw new Error('Label length must be <= 255 bytes');
  }
  let type = 0;
  if (!isArrayBuffer(data)) {
    if (data && isArrayBuffer(data.buffer)) {
      // data is an ArrayBufferView, slice it just in case it is smaller
      // than the underlying buffer...
      data = data.slice().buffer;
    } else {
      data = toUTF8(JSON.stringify(data)).buffer;
      type |= constants.JSON_MSG_FLAG;
    }
  }
  data = new Uint8Array(data);
  const finalData = new Uint8Array(2 + label.byteLength + data.byteLength);
  finalData[0] = type;
  finalData[1] = label.byteLength;
  finalData.set(label, 2);
  finalData.set(data, 2 + label.byteLength);
  return finalData.buffer;
}

function decodeAck(buffer) {
  const data = new Uint8Array(buffer);
  const msgId = getInt(data, 1);
  const chunkId = getWord(data, 5);
  return {
    msgId,
    chunkId,
  };
}

function encodeChunk(msgId, chunkId, numChunks, data) {
  const output = new Uint8Array(9 + data.byteLength);
  output[0] = constants.CHUNKED_MSG_TYPE;
  putInt(output, 1, msgId);
  putWord(output, 5, chunkId);
  putWord(output, 7, numChunks);
  output.set(data, 9);
  return output.buffer;
}

function decodeChunk(buffer) {
  let data = new Uint8Array(buffer);
  const version = data[0];
  const msgId = getInt(data, 1);
  const chunkId = getWord(data, 5);
  const numChunks = getWord(data, 7);
  data = data.subarray(9);
  return {
    version,
    msgId,
    chunkId,
    numChunks,
    data,
  };
}

class OutMessage {
  constructor(data, label, peer, resolve, reject, cliqzPeer) {
    this.msgTimeout = cliqzPeer.msgTimeout;
    this.retries = 0;
    this.maxRetries = cliqzPeer.maxMessageRetries;
    this.peer = peer;
    this.resolve = resolve;
    this.reject = reject;
    this.cliqzPeer = cliqzPeer;

    this.log = cliqzPeer.log.bind(null, `[${peer}]`);
    this.logDebug = cliqzPeer.logDebug.bind(null, `[${peer}]`);
    this.logError = cliqzPeer.logError.bind(null, `[${peer}]`);

    this.chunkSize = cliqzPeer.chunkSize;
    do {
      this.msgId = Math.round(random() * 2000000000);
    } while (cliqzPeer.outMessages[this.msgId]);
    // TODO: not very nice, might be a good idea to rethink it...
    cliqzPeer.outMessages[this.msgId] = this;

      // Build msg
    const finalBuffer = encodeMessage(data, label);
    const finalData = new Uint8Array(finalBuffer);
    this.numChunks = Math.ceil(finalData.byteLength / this.chunkSize);
    this.chunks = [];
    for (let i = 0; i < this.numChunks; ++i) {
      const numBytes = Math.min(
        finalData.byteLength,
        (i + 1) * this.chunkSize,
      ) - (i * this.chunkSize);
      const chunk = encodeChunk(
        this.msgId,
        i,
        this.numChunks,
        finalData.subarray(i * this.chunkSize, (i * this.chunkSize) + numBytes),
      );
      this.chunks.push(chunk);
    }
  }

  scheduleKiller() {
    if (this.msgKiller) {
      this.cancelKiller();
    }
    this.msgKiller = this.cliqzPeer.setTimeout(() => {
      this.kill();
    }, this.msgTimeout);
  }

  cancelKiller() {
    this.cliqzPeer.clearTimeout(this.msgKiller);
  }

  kill(success) {
    this.cancelKiller();
    if (!success) {
      this.cliqzPeer.checkPeerConnection(this.peer)
          .then(() => {
            if (this.retries >= this.maxRetries) {
              throw new Error('Max retries exceeded');
            }
            ++this.retries;
            this.send();
          })
          .catch((ex) => {
            this.logError('Killing outcoming message', this.msgId, 'to peer', this.peer);
            delete this.cliqzPeer.outMessages[this.msgId];
            this.reject(`killing outcoming message: ${ex}`);
          });
    } else {
      delete this.cliqzPeer.outMessages[this.msgId];
    }
  }

  receivedAck(chunk) {
    if (chunk < this.numChunks) {
      if (!this.isChunkReceived[chunk]) {
        this.isChunkReceived[chunk] = true;
        this.cliqzPeer.stats.outbytes += this.chunks[chunk].byteLength;
        --this.remainingChunks;
        if (this.remainingChunks === 0) {
          this.logDebug('Received last ack ', this.msgId, chunk);
          this.cliqzPeer.stats.outmsgs++;
          this.kill(true);
          this.resolve();
        } else {
          this.logDebug('Received ack ', this.msgId, chunk);
          this.scheduleKiller();
        }
      } else {
        this.logError('Warning: repeated chunk');
      }
    } else {
      this.logError('Warning: chunk number is too big');
    }
  }

  send() {
    this.isChunkReceived = [];
    this.remainingChunks = this.numChunks;
    this.scheduleKiller();
    const peer = this.peer;
    this.cliqzPeer.connectPeer(peer)
      .then(() => {
        const conn = this.cliqzPeer._getConnection(peer);
        for (let i = 0; i < this.numChunks; ++i) {
          this.cliqzPeer.stats.outtotalbytes += this.chunks[i].byteLength;
          conn.send(this.chunks[i]);
        }
      })
      .catch(e => this.logError('Error sending msg', e));
  }
}

class InMessage {
  constructor(firstChunk, peer, resolve, cliqzPeer) {
    this.msgTimeout = cliqzPeer.msgTimeout;
    this.cliqzPeer = cliqzPeer;

    this.log = cliqzPeer.log.bind(null, `[${peer}]`);
    this.logDebug = cliqzPeer.logDebug.bind(null, `[${peer}]`);
    this.logError = cliqzPeer.logError.bind(null, `[${peer}]`);

    this.peer = peer;
    this.resolve = resolve;
    this.chunks = [];
    this.numChunks = firstChunk.numChunks;
    this.remainingChunks = this.numChunks;
    this.msgId = firstChunk.msgId;
    this.currentSize = 0;
    // TODO: not very nice, might be a good idea to rethink it...
    cliqzPeer.inMessages[this.msgId] = this;
    this.scheduleKiller();
    this.receivedChunk(firstChunk);
  }

  receivedChunk({ chunkId, data }) {
    // decodeChunk gives us some guarantees:
    // version is 1 byte int
    // msgId is 4 bytes int
    // chunkId is 2 bytes int (good to limit max number of chunks)
    // numChunks is 2 bytes int
    // data is Uint8Array
    if (chunkId < this.numChunks) {
      if (!this.chunks[chunkId]) {
        this.currentSize += data.byteLength;
        this.cliqzPeer.stats.inbytes += data.byteLength;
        if (
          !this.cliqzPeer.messageSizeLimit || this.currentSize <= this.cliqzPeer.messageSizeLimit
        ) {
          this.chunks[chunkId] = data;
          --this.remainingChunks;
          this.sendAck(chunkId);
          if (this.remainingChunks === 0) {
            this.logDebug('Received last chunk ', this.msgId, chunkId);
            this.cliqzPeer.stats.inmsgs++;
            this.kill(true);
            this.cliqzPeer.setTimeout(() => {
              // TODO: with big messages, this call seems to be expensive and was blocking the
              // last ack message
              // Setting this in a zero timeout seems to solve it, but probably should optimize
              // it...
              const totalSize = this.chunks.reduce((prev, x) => prev + x.byteLength, 0);
              const totalData = new Uint8Array(totalSize);
              this.chunks.reduce((prev, x) => {
                totalData.set(x, prev);
                return prev + x.byteLength;
              }, 0);
              const decoded = decodeMessage(totalData.buffer);
              this.resolve(decoded.data, decoded.label);
            }, 0);
          } else {
            this.logDebug('Received chunk ', this.msgId, chunkId, this.remainingChunks);
            this.scheduleKiller();
          }
        } else {
          this.logError('Message size exceeded, killing message...');
          this.kill();
        }
      } else {
        this.logError('Warning: received repeated chunk');
      }
    } else {
      this.logError('Warning: received chunk number is too big, killing message');
      this.kill();
    }
  }

  scheduleKiller() {
    if (this.msgKiller) {
      this.cancelKiller();
    }
    this.msgKiller = this.cliqzPeer.setTimeout(() => {
      this.kill();
    }, this.msgTimeout);
  }

  sendAck(numChunk) {
    const peer = this.peer;
    this.cliqzPeer.connectPeer(peer)
      .then(() => this.cliqzPeer._getConnection(peer).send(encodeAck(this.msgId, numChunk)));
  }

  cancelKiller() {
    this.cliqzPeer.clearTimeout(this.msgKiller);
  }

  kill(success) {
    this.cancelKiller();
    delete this.cliqzPeer.inMessages[this.msgId];
    if (!success) {
      this.logError('Killing incoming message', this.msgId, 'from peer', this.peer);
          // this.reject();
    }
  }
}

export { OutMessage, InMessage, encodeChunk, decodeChunk, encodeAck, decodeAck };
