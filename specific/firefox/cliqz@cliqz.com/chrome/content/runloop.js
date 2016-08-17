'use strict';


var _timers = [],
    _setTimer = function(func, timeout, type, args) {
      var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
      _timers.push(timer);

      var event = {
        notify: function (timer) {
          func.apply(null, args);

          // remove the reference of the setTimeout instances
          // be sure the setInterval instances do not get canceled and removed
          // loosing all the references of a setInterval allows the garbage
          // collector to stop the interval
          if(Ci && type == Ci.nsITimer.TYPE_ONE_SHOT){
            _removeTimerRef && _removeTimerRef(timer);
          }
        }
      };
      timer.initWithCallback(event, timeout, type);
      return timer;
    },
    _removeTimerRef = function(timer){
      timer.cancel();

      var i = _timers.indexOf(timer);
      if (i >= 0) {
        _timers.splice(_timers.indexOf(timer), 1);
      }
    },

    setInterval = function(func, timeout) {
      return _setTimer(func, timeout, Ci.nsITimer.TYPE_REPEATING_PRECISE, [].slice.call(arguments, 2));
    },
    setTimeout = function(func, timeout) {
      return _setTimer(func, timeout, Ci.nsITimer.TYPE_ONE_SHOT, [].slice.call(arguments, 2));
    },
    clearTimeout = function(timer) {
      if (!timer) {
          return;
      }
      _removeTimerRef(timer);
    };

this.setTimeout = setTimeout;
this.setInterval = setInterval;
this.clearTimeout = clearTimeout;
this.clearInterval = clearTimeout;

this.cliqzRunloop = {
  stop: function() {
    //stop all the timers still active and lose their reference
    _timers.forEach(function(timer){ timer.cancel(); });
    _timers = [];
  }
}

const global = {};
Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/es6-promise/es6-promise.js', global);

global.ES6Promise.Promise._setScheduler(function (flush) {
  return setTimeout(flush, 1);
});

this.Promise = global.ES6Promise.Promise;
