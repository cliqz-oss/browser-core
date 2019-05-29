/*
 * This method implements the publish subscribe design pattern
 *
 * Event naming scheme:
 *    cliqz.module_name.event_name
 *
 *  single sender -> multiple potential recipients
 *    for example: cliqz.core.urlbar_focus (inform others about urlbar focus)
 *    module_name describes sender
 *  multiple potential senders -> single recipient
 *    for example: cliqz.msg_center.show_message (tell the message center to show a message)
 *    module_name describes recipient (this is more like a RPC)
 */

import console from './console';
import { nextTick } from './decorators';

const CliqzEvents = {
  // use a javascript object to push the message ids and the callbacks
  cache: {},
  tickCallbacks: [],
  /*
   * Publish events of interest with a specific id
   */
  queue: [],

  pub(id, ...args) {
    const callbacks = (CliqzEvents.cache[id] || []).map(ev =>
      nextTick(() => {
        ev.call(null, ...args);
      }).catch((e) => {
        console.error(`CliqzEvents error: ${id}`, e);
      }));

    const finishedPromise = Promise.all(callbacks).then(() => {
      const index = this.queue.indexOf(finishedPromise);
      this.queue.splice(index, 1);
      if (this.queue.length === 0) {
        this.triggerNextTick();
      }
    });
    this.queue.push(finishedPromise);
  },

  triggerNextTick() {
    this.tickCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        // empty
      }
    });
    this.tickCallbacks = [];
  },

  nextTick(cb = () => {}) {
    this.tickCallbacks = this.tickCallbacks || [];
    this.tickCallbacks.push(cb);
  },

  /* Subscribe to events of interest
   * with a specific id and a callback
   * to be executed when the event is observed
   */
  sub(id, fn) {
    CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
    CliqzEvents.cache[id].push(fn);
  },

  subscribe(eventName, callback, that) {
    let cb;
    if (that) {
      cb = callback.bind(that);
    } else {
      cb = callback;
    }

    CliqzEvents.sub(eventName, cb);

    return {
      unsubscribe() {
        CliqzEvents.un_sub(eventName, cb);
      }
    };
  },

  un_sub(id, fn) {
    if (!CliqzEvents.cache[id] || CliqzEvents.cache[id].length === 0) {
      console.error(id, 'Trying to unsubscribe event that had no subscribers');
      return;
    }

    const index = CliqzEvents.cache[id].indexOf(fn);
    if (index > -1) {
      CliqzEvents.cache[id].splice(index, 1);
    } else {
      console.error(id, 'Trying to unsubscribe an unknown listener', id, fn);
    }
  },

  clean_channel(id) {
    if (!CliqzEvents.cache[id]) {
      throw new Error(`Trying to unsubscribe an unknown channel: ${id}`);
    }
    CliqzEvents.cache[id] = [];
  },

  /**
   * Adds a listener to eventTarget for events of type eventType, and republishes them
   *  through CliqzEvents with id cliqzEventName.
   */
  proxyEvent(cliqzEventName, eventTarget, eventType, propagate = false, transform) {
    const publisher = CliqzEvents.pub.bind(CliqzEvents, cliqzEventName);

    function handler(...args) {
      const _args = transform ? transform.call(null, ...args) : args;
      publisher.call(null, ..._args);
    }

    eventTarget.addEventListener(eventType, handler, propagate);
    return {
      unsubscribe() {
        eventTarget.removeEventListener(eventType, handler);
      }
    };
  },

  nextId: function nextId() {
    nextId.id = nextId.id || 0;
    nextId.id += 1;
    return nextId.id;
  },

  purge() {
    this.cache = {};
    this.tickCallbacks = [];
    this.queue = [];
  },
};

export default CliqzEvents;
export const subscribe = CliqzEvents.subscribe;
