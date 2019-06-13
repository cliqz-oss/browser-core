/* eslint no-param-reassign: off */

import { NetInfo } from 'react-native';
import console from '../core/console';
import config from '../core/config';
import { fetch, Request } from './fetch';
import getDexie from './lib/dexie';
import ua from './user-agent';

const VERSION = '2.2';
const QUEUE_MAX_SIZE = 100;
const MAX_BATCH_SIZE = 5;

class MessageBatch {
  constructor(collection, docs) {
    this.collection = collection;
    this.docs = docs;
  }

  getMessages() {
    return this.docs.map(row => row.msg);
  }

  delete() {
    return this.collection.delete();
  }
}

class MessageQueue {
  constructor(maxSize) {
    this.maxSize = maxSize;
  }

  async init() {
    const Dexie = await getDexie();
    this.db = new Dexie('telemetry-queue2');
    this.db.version(1).stores({
      queue: 'id',
    });
    this.queue = this.db.queue;
    return this.db.open();
  }

  getSize() {
    return this.queue.count().then((count) => {
      console.log(`MessageQueue has ${count} messages`);
      return count;
    });
  }

  async getMessageBatch(maxSize) {
    const batchCollection = this.queue.limit(maxSize);
    const entries = await batchCollection.toArray();
    return new MessageBatch(batchCollection, entries);
  }

  prune() {
    return this.getSize().then((length) => {
      const pruneCount = length - this.maxSize;
      if (pruneCount > 0) {
        return this.getMessageBatch(pruneCount).then(batch => batch.delete());
      }
      return Promise.resolve();
    });
  }

  /**
   * Create a unique id for the database, which preserves temporal ordering and attempts
   * to cause minimal probability of duplicates. This is done by taking the current millisecond
   * timestamp and appending 5 random digits on the end.
   * @return {String} unique ID
   */
  static generateMessageId() {
    return [String(Date.now()), String(Math.random()).substring(2, 7)].join('_');
  }

  push(msg) {
    return this.queue.put({
      id: MessageQueue.generateMessageId(),
      msg,
    });
  }
}

const queue = new MessageQueue(QUEUE_MAX_SIZE);

function makeTelemetryRequest(data) {
  const req = new Request(config.settings.SAFE_BROWSING, { method: 'POST', body: data });
  return fetch(req).then((response) => {
    if (response.status === 200) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`non 200 status code ${response.status}`));
  }).catch((error) => {
    console.error('fetch error', error);
    return Promise.reject(error);
  });
}

function pushTelemetry() {
  return queue.getMessageBatch(MAX_BATCH_SIZE).then((batch) => {
    const messages = batch.getMessages();
    const fullBatch = messages.length >= MAX_BATCH_SIZE;
    const data = JSON.stringify(messages);
    console.log(`Push ${messages.length} telemetry messages`);
    return makeTelemetryRequest(data)
      .then(() => batch.delete())
      .then(() => fullBatch)
      .catch((error) => {
        console.error('telemetry push error', error);
        return queue.prune();
      });
  });
}

class PushScheduler {
  constructor() {
    this.pushRequested = false;
    this.timer = null;
    this.pushInProcess = false;
    this.pushAllowed = false;

    // get and listen on netinfo changes
    NetInfo.getConnectionInfo().then(this.onConnectivityChange.bind(this));
    NetInfo.addEventListener('connectionChange', this.onConnectivityChange.bind(this));
  }

  requestPush() {
    // push already on the way
    if (this.pushRequested && this.timer) {
      return;
    }
    if (!this.timer && this.pushAllowed) {
      this.timer = setTimeout(this.instantPush.bind(this), 30000);
    }
    this.pushRequested = true;
  }

  instantPush() {
    if (this.pushInProcess) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pushInProcess = true;
    this.pushRequested = false;
    // pushTelemetry returns a promise which tells us whether there are more
    // entries to process
    pushTelemetry().then((queueRemains) => {
      if (queueRemains) {
        this.requestPush();
      }
      this.pushInProcess = false;
    }).catch(() => {
      this.requestPush();
      this.pushInProcess = false;
    });
  }

  isTelemetryPermitted() {
    return new Promise((resolve, reject) => {
      NetInfo.fetch().then((status) => {
        if (status === 'wifi' || status === 'WIFI') {
          resolve();
        } else {
          reject(status);
        }
      });
    });
  }

  onConnectivityChange({ type }) {
    if (type === 'wifi') {
      console.log('push permitted (wifi)');
      this.pushAllowed = true;
      if (this.pushRequested) {
        this.requestPush();
      }
    } else {
      console.log(`push prohibited (${type})`);
      this.pushAllowed = false;
    }
  }
}

const scheduler = new PushScheduler();

// check whether to start pushing
queue.init().then(() => queue.getSize()).then((size) => {
  if (size > 0) {
    scheduler.requestPush();
  }
});

// subset of CliqzHumanWeb.msgSanitize, excluding cases for messages we won't see
function msgSanitize(msg) {
  // quick & dirty implementation of the ts_config which would usually come from HW config url.
  msg.ts = (new Date()).toISOString().substring(0, 10).replace(/-/g, '');
  if (!msg.ts || msg.ts === '') {
    return null;
  }
  return msg;
}


// from CliqzHumanWeb.telemetry with unneeded parts removed
function hwTelemetry(msg, instantPush) {
  msg.ver = VERSION;
  msg.platform = 'mobile';
  msg.userAgent = ua.OS;
  msg.channel = ua.channel;
  msg = msgSanitize(msg);
  if (!msg) {
    return;
  }

  queue.push(msg).then(() => {
    if (instantPush) {
      scheduler.instantPush();
    } else {
      scheduler.requestPush();
    }
  }).catch((e) => {
    console.error(e);
  });
}

export default {
  telemetry(payload, instantPush) {
    console.log('Sending telemetry');
    hwTelemetry(payload, instantPush);
  },
  msgType: 'humanweb'
};
