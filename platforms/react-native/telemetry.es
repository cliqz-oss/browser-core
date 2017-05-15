import console from '../core/console';
import { utils } from '../core/cliqz';
import { fetch, Request } from './fetch';
import Database from '../core/database';
import { NetInfo } from 'react-native';
import { userAgent } from './platform';

const VERSION = '2.2';
const QUEUE_MAX_SIZE= 100;
const MAX_BATCH_SIZE = 5;


class PushScheduler {

  constructor() {
    this.pushRequested = false;
    this.timer = null;
    this.pushInProcess = false;
    this.pushAllowed = false;

    // get and listen on netinfo changes
    NetInfo.fetch().done(this.onConnectivityChange.bind(this));
    NetInfo.addEventListener('change', this.onConnectivityChange.bind(this));
  }

  requestPush() {
    // push already on the way
    if (this.pushRequested && this.timer) {
      return;
    }
    if (!this.timer && this.pushAllowed) {
      this.timer = utils.setTimeout(this.instantPush.bind(this), 30000);
    }
    this.pushRequested = true;
  }

  instantPush() {
    if (this.pushInProcess) {
      return;
    }
    if (this.timer) {
      utils.clearTimeout(this.timer);
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
      NetInfo.fetch().done((status) => {
        if (status === 'wifi' || status === 'WIFI') {
          resolve();
        } else {
          reject(status);
        }
      });
    });
  }

  onConnectivityChange(status) {
    if (status === 'wifi' || status === 'WIFI') {
      console.log('push permitted (wifi)');
      this.pushAllowed = true;
      if (this.pushRequested) {
        this.requestPush();
      }
    } else {
      console.log(`push prohibited (${status})`);
      this.pushAllowed = false;
    }
  }

}

class MessageBatch {

  constructor(queue, docs) {
    this.queue = queue;
    this.docs = docs;
  }

  getMessages() {
    return this.docs.rows.map(row => row.doc.msg);
  }

  delete() {
    const deleteDocs = this.docs.rows.map((row) => ({
      _id: row.doc._id,
      _rev: row.doc._rev,
      _deleted: true,
    }));
    return this.queue.bulkDocs(deleteDocs);
  }
}

class MessageQueue {

  constructor(maxSize) {
    this.maxSize = maxSize;
    this.queue = new Database('telemetry-queue', {auto_compaction: true});
  }

  getSize() {
    return this.queue.info().then((info) => {
      console.log(`MessageQueue has ${info.doc_count} messages`);
      return info.doc_count;
    });
  }

  getMessageBatch(maxSize) {
    return this.queue.allDocs({
      include_docs: true,
      limit: maxSize,
    }).then((docs) => {
      return new MessageBatch(this.queue, docs);
    });
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
      _id: MessageQueue.generateMessageId(),
      msg,
    });
  }
}

const queue = new MessageQueue(QUEUE_MAX_SIZE);
const scheduler = new PushScheduler();


// check whether to start pushing
queue.getSize().then((size) => {
  if (size > 0) {
    scheduler.requestPush();
  }
});

function pushTelemetry() {
  return queue.getMessageBatch(MAX_BATCH_SIZE).then((batch) => {
    const messages = batch.getMessages();
    const fullBatch = messages.length >= MAX_BATCH_SIZE;
    const data = JSON.stringify(messages);
    console.log(`Push ${messages.length} telemetry messages`);
    return makeTelemetryRequest(data).then(() => batch.delete()).then(() => fullBatch).catch((error) => {
      console.error('telemetry push error', error);
      return queue.prune();
    });
  });
}


// subset of CliqzHumanWeb.msgSanitize, excluding cases for messages we won't see
function msgSanitize(msg) {
  // quick & dirty implementation of the ts_config which would usually come from HW config url.
  msg.ts = (new Date()).toISOString().substring(0, 10).replace(/-/g, "");
  if(!msg.ts || msg.ts === ''){
      return null;
  }
  return msg;
}


// from CliqzHumanWeb.telemetry with unneeded parts removed
function hwTelemetry(msg, instantPush) {
  msg.ver = VERSION;
  msg.platform = "mobile";
  msg.userAgent = userAgent.systemName;
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

function makeTelemetryRequest(data) {
  const req = new Request(utils.SAFE_BROWSING, {method: 'POST', body: data});
  return fetch(req).then(response => {
    if(response.status === 200) {
      return Promise.resolve();
    }
    return Promise.reject(`non 200 status code ${response.status}`);
  }).catch(error => {
    console.error('fetch error', error);
    return Promise.reject(error);
  });
}

export default {
  telemetry(payload, instantPush) {
    console.log("Sending telemetry");
    hwTelemetry(payload, instantPush);
  },
  msgType: 'humanweb'
};
