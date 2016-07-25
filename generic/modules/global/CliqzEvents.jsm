'use strict';
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

var EXPORTED_SYMBOLS = ['CliqzEvents'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzEvents = CliqzEvents || {
  //use a javascript object to push the message ids and the callbacks
  cache: {},
  /*
   * Publish events of interest with a specific id
   */
  pub: function (id) {
    var args = Array.prototype.slice.call(arguments, 1);
    (CliqzEvents.cache[id] || []).forEach(function (ev) {
      CliqzUtils.setTimeout(function () {
        try {
          ev.apply(null, args);
        } catch(e) {
          CliqzUtils.log(e.toString()+" -- "+e.stack, "CliqzEvents error: "+id);
        }
      }, 0);
    });
  },

  /* Subscribe to events of interest
   * with a specific id and a callback
   * to be executed when the event is observed
   */
  sub: function (id, fn) {
    CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
    CliqzEvents.cache[id].push(fn);
  },

  un_sub: function (id, fn) {
    var index;
    if (!CliqzEvents.cache[id]) {
      return;
    }
    if (!fn) {
      CliqzEvents.cache[id] = [];
    } else {
      index = CliqzEvents.cache[id].indexOf(fn);
      if (index > -1) {
        CliqzEvents.cache[id].splice(index, 1);
      }
    }
  },

  nextId: function nextId() {
    nextId.id = nextId.id || 0;
    nextId.id += 1;
    return nextId.id;
  }
};
