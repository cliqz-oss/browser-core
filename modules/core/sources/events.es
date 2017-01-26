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

import console from "core/console";
import CliqzUtils from "core/utils";

var CliqzEvents = CliqzEvents || {
  //use a javascript object to push the message ids and the callbacks
  cache: {},
  tickCallbacks: [],
  /*
   * Publish events of interest with a specific id
   */
  queue: [],

  pub: function (id) {
    const args = Array.prototype.slice.call(arguments, 1);

    const callbacks = (CliqzEvents.cache[id] || []).map(ev => {
      return new CliqzUtils.Promise(resolve => {
        CliqzUtils.setTimeout(function () {
          try {
            ev.apply(null, args);
          } catch(e) {
            console.error(`CliqzEvents error: ${id}`, e);
          }
          resolve();
        }, 0);
      });
    });

    const finishedPromise = CliqzUtils.Promise.all(callbacks).then(() => {
      const index = this.queue.indexOf(finishedPromise);
      this.queue.splice(index, 1);
      if (this.queue.length === 0) {
        this.triggerNextTick();
      }
    });
    this.queue.push(finishedPromise);
  },

  triggerNextTick() {
    this.tickCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
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
  sub: function (id, fn) {
    CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
    CliqzEvents.cache[id].push(fn);
  },

  subscribe(eventName, callback, that) {
    let cb;
    if (that) {
      cb = callback.bind(that)
    } else {
      cb = callback;
    }

    CliqzEvents.sub(eventName, cb);

    return {
      unsubscribe() {
        CliqzEvents.un_sub(eventName, cb);
      }
    }
  },

  un_sub: function (id, fn) {
    if (!CliqzEvents.cache[id] || CliqzEvents.cache[id].length === 0) {
      console.error("Trying to unsubscribe event that had no subscribers")
      return;
    }

    let index = CliqzEvents.cache[id].indexOf(fn);
    if (index > -1) {
      CliqzEvents.cache[id].splice(index, 1);
    } else {
      console.error("Trying to unsubscribe an unknown listener");
    }
  },

  clean_channel: function(id) {
    if (!CliqzEvents.cache[id]) {
      throw "Trying to unsubscribe an unknown channel";
    }
    CliqzEvents.cache[id] = [];
  },

  /**
   * Adds a listener to eventTarget for events of type eventType, and republishes them
   *  through CliqzEvents with id cliqzEventName.
   */
  proxyEvent(cliqzEventName, eventTarget, eventType, propagate = false, transform)  {
    const publisher = CliqzEvents.pub.bind(CliqzEvents, cliqzEventName);

    function handler() {
      const args = transform ? transform.apply(null, arguments) : arguments;
      publisher.apply(null, args);
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
  }
};

export default CliqzEvents;
export let subscribe = CliqzEvents.subscribe;
