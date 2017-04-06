'use strict';

var _timers = [];

function _setTimer(func, timeout, type, args) {
  var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
  _timers.push(timer);

  var event = {
    notify: function (timer) {
      func.apply(null, args);

      // remove the reference of the setTimeout instances
      // be sure the setInterval instances do not get canceled and removed
      // loosing all the references of a setInterval allows the garbage
      // collector to stop the interval
      if (Ci && type == Ci.nsITimer.TYPE_ONE_SHOT){
        _removeTimerRef && _removeTimerRef(timer);
      }
    },
  };
  timer.initWithCallback(event, timeout, type);
  return timer;
}

function _removeTimerRef(timer) {
  timer.cancel();

  var i = _timers.indexOf(timer);
  if (i >= 0) {
    _timers.splice(_timers.indexOf(timer), 1);
  }
}

function setInterval(func, timeout) {
  return _setTimer(func, timeout, Ci.nsITimer.TYPE_REPEATING_PRECISE, [].slice.call(arguments, 2));
}

function setTimeout(func, timeout) {
  return _setTimer(func, timeout, Ci.nsITimer.TYPE_ONE_SHOT, [].slice.call(arguments, 2));
}

function clearTimeout(timer) {
  if (!timer) {
    return;
  }
  _removeTimerRef(timer);
}

function clearRunloop() {
  // stop all the timers still active and lose their reference
  _timers.forEach(function (timer) { timer.cancel(); });
  _timers = [];
}

// Exports
this.setTimeout = setTimeout;
this.setInterval = setInterval;
this.clearTimeout = clearTimeout;
this.clearInterval = clearTimeout;
this.clearRunloop = clearRunloop;
