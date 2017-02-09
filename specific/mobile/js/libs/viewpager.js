!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ViewPager=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*global module, window*/
'use strict';

function noop() {}

module.exports = window.console || {
  assert: noop,
  clear: noop,
  constructor: noop,
  count: noop,
  debug: noop,
  dir: noop,
  dirxml: noop,
  error: noop,
  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,
  info: noop,
  log: noop,
  markTimeline: noop,
  profile: noop,
  profileEnd: noop,
  table: noop,
  time: noop,
  timeEnd: noop,
  timeStamp: noop,
  timeline: noop,
  timelineEnd: noop,
  trace: noop,
  warn: noop
};

},{}],2:[function(_dereq_,module,exports){
/*global module*/
'use strict';

module.exports = {
  add: function (el, type, fn, capture) {
    var i, l;
    if (!(type instanceof Array)) {
      type = [type];
    }
    for (i = 0, l = type.length; i < l; i += 1) {
      el.addEventListener(type[i], fn, {capture: !!capture, passive: false});
    }
  },

  remove: function (el, type, fn, capture) {
    var i, l;
    if (!(type instanceof Array)) {
      type = [type];
    }
    for (i = 0, l = type.length; i < l; i += 1) {
      el.removeEventListener(type[i], fn, {capture: !!capture, passive: false});
    }
  }
};

},{}],3:[function(_dereq_,module,exports){
/*global require, module, window */
'use strict';

var Utils = _dereq_('./utils'),
    Raf = _dereq_('./raf'),
    Events = _dereq_('./events'),
    Scroller = _dereq_('./scroller'),
    GestureDetector = _dereq_('./gesture_detector');

function ViewPager(elem, options) {
  options = options || {};
  var ANIM_DURATION_MAX = options.anim_duration !== undefined ? options.anim_duration : 200,
      PREVENT_ALL_NATIVE_SCROLLING = options.prevent_all_native_scrolling !== undefined ? options.prevent_all_native_scrolling : false,
      DIRECTION_HORIZONTAL = !options.vertical,
      TIPPING_POINT = options.tipping_point !== undefined ? options.tipping_point : 0.5,
      /** Default interpolator, undefined is ok */
      INTERPOLATOR = options.interpolator,

      MIN_DISTANCE_FOR_FLING_MS = 5, // px
      MIN_FLING_VELOCITY_PX_PER_MS = 0.1, //0.4, // px / ms

      elemSize = options.dragSize || undefined,
      elemSizeOnChange = function () { invalidateElemSize(); },
      noop = function () {},
      onPageScroll = options.onPageScroll || noop,
      onPageChange = options.onPageChange || noop,

      active = false,
      animationId,
      scroller = new Scroller(),

      position = 0;

  function invalidateElemSize() {
    var rect = elem.getBoundingClientRect();
    var updatedSize = DIRECTION_HORIZONTAL ? rect.width : rect.height;
    if (elemSize) {
      var ratio = position === 0 ? 0 : position / elemSize;
      position = ratio * updatedSize;
      elemSize = updatedSize;
    } else {
      elemSize = updatedSize;
    }
    return elemSize;
  }

  function deltaToPage(pageIndex) {
    return (-position) - (pageIndex * elemSize);
  }

  /**
   * @return targetPage {Number} Page to scroll to
   */
  function determineTargetPage(pos, deltaPx, velocity) {
    var pi = positionInfo(pos),
        page = pi.page,
        pageOffset = pi.pageOffset,
        direction = Utils.sign(deltaPx),
        targetPage = page + Math.round(pageOffset);
    // FLING
    if (Math.abs(deltaPx) > MIN_DISTANCE_FOR_FLING_MS &&
        Math.abs(velocity) > MIN_FLING_VELOCITY_PX_PER_MS) {
      targetPage = velocity > 0 ? page : page + 1;
    } else { // NO FLING, check position
      var totalDelta = Math.abs(deltaPx / elemSize),
          pageDelta = totalDelta - Math.floor(totalDelta);
      if (Math.abs(pageDelta) > TIPPING_POINT) {
        targetPage = page + Math.ceil(pageDelta) * -direction;
        targetPage += (direction < 0) ? 0 : 1;
      }
    }
    if (CLIQZ.UI.nPages) {
      targetPage = Utils.clamp(targetPage, 0, CLIQZ.UI.nPages - 1);
    }
    return targetPage;
  }

  function positionInfo(pos) {

    var totalOffset = -pos / elemSize,
        page = Math.floor(totalOffset),
        pageOffset = totalOffset - page;
    return ({ page: page,
              pageOffset: pageOffset,
              totalOffset: totalOffset });
  }

  function handleOnScroll(pos) {
    var scrollInfo = positionInfo(pos);
    scrollInfo.animOffset = scroller.getProgress();
    onPageScroll(scrollInfo);
  }

  function handleAnimEnd() {
    onPageChange(-Math.round(position / elemSize));
  }

  function animate(interpolator) {
    function update () {
      var isAnimating = scroller.computeScrollOffset();
      if (interpolator !== undefined) {
        position = Utils.lerp(interpolator(scroller.getProgress()),
                              scroller.getStartX(), scroller.getFinalX());
      } else {
        position = scroller.getCurrX();
      }

      if(!position) {
         //return;
      }

      handleOnScroll(position);

      if (isAnimating) {
        animationId = Raf.requestAnimationFrame(update);
      } else {
        handleAnimEnd();
      }
    }
    Raf.cancelAnimationFrame(animationId);
    animationId = Raf.requestAnimationFrame(update);
  }

  var gestureDetector = new GestureDetector(elem, {
    onFirstDrag: function onFirstDrag(p) {
      // prevent default scroll if we move in paging direction
      active = PREVENT_ALL_NATIVE_SCROLLING || (DIRECTION_HORIZONTAL ? Math.abs(p.dx) > Math.abs(p.dy) : Math.abs(p.dx) < Math.abs(p.dy));
      if (active) {
        p.event.preventDefault();
      }
    },
    onDrag: function onDrag(p) {
      if (!active) { return; }
      var change = DIRECTION_HORIZONTAL ? p.dx : p.dy;
      var tmpPos = -(change + position);
      if (CLIQZ.UI.nPages && (tmpPos < 0 || tmpPos > ((CLIQZ.UI.nPages - 1) * elemSize))) {
        change = change / 3;
      }
      position += change;
      scroller.forceFinished(true);
      handleOnScroll(position);
      if (active) {
        p.event.preventDefault();
      }
    },

    onFling: function onFling(p, v) {
      if (!active) { return; }
      active = false;
      var velo = DIRECTION_HORIZONTAL ? v.vx : v.vy,
          deltaPx = DIRECTION_HORIZONTAL ? p.totaldx : p.totaldy,
          deltaOffset = deltaToPage(determineTargetPage(position, deltaPx, velo));
      scroller.startScroll(position, 0,
                           deltaOffset, 0,
                           ANIM_DURATION_MAX);
      animate(INTERPOLATOR);
    }
  });

  if (!elemSize) {
    invalidateElemSize();
    Events.add(window, 'resize', elemSizeOnChange);
  }

  return {
    /** Remove listeners */
    destroy: function destroy() {
      gestureDetector.destroy();
      Events.remove(window, 'resize', elemSizeOnChange);
    },

    /**
     * Go to next page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    next: function next(duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX,
          page = -((scroller.isFinished() ? position : (scroller.getFinalX())) / elemSize) + 1;
      if (CLIQZ.UI.nPages) {
        page = Utils.clamp(page, 0, CLIQZ.UI.nPages - 1);
      }

      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate(interpolator);
    },

    /**
     * Go to previous page.
     *
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    previous: function previous(duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX,
          page = -((scroller.isFinished() ? position : (scroller.getFinalX())) / elemSize) - 1;

      if (CLIQZ.UI.nPages) {
        page = Utils.clamp(page, 0, CLIQZ.UI.nPages - 1);
      }
      scroller.startScroll(position, 0,
                           deltaToPage(page), 0,
                           t);
      animate(interpolator);
    },

    /**
     * @param {Number} page index of page
     * @param {Number|boolean} duration Animation duration 0 or false
     * for no animation.
     * @param {function} interpolator a function that interpolates a number [0-1]
     */
    goToIndex: function goToIndex(page, duration, interpolator) {
      var t = duration !== undefined ? Math.abs(duration) : ANIM_DURATION_MAX;
      if (CLIQZ.UI.nPages) {
        page = Utils.clamp(page, 0, CLIQZ.UI.nPages - 1);
      }
      var delta = deltaToPage(page);

      scroller.startScroll(position, 0,
                           delta, 0,
                           t);
      animate(interpolator);
    }
  };
}

module.exports = ViewPager;

},{"./events":2,"./gesture_detector":4,"./raf":5,"./scroller":6,"./utils":7}],4:[function(_dereq_,module,exports){
/*global console, window, require, module */
'use strict';

/**
 * onFling function
 * @name GestureDetector~onFling
 * @function
 * @param {String} p - Information about the error.
 * @param {Number} velocity - An integer of joy.
 * @return undefined
 */

/**
 * @param options Options to use.
 * @param options.onFling Fling callback.
 * @param options.onDrag Drag callback.
 * @param options.onUp Mouse/Touch up callback.
 * @param options.onDown Mouse/Touch down callback.
 * @param options.onFirstDrag First drag event callback. Useful for
 *                            canceling default browser behaviour.
 */
function GestureDetector(elem, options) {
  var Events = _dereq_('./events'),
      VelocityTracker = _dereq_('./velocity_tracker');

  var hasTouch = 'ontouchstart' in window,
      evStartName = hasTouch ? 'touchstart' : 'mousedown',
      evMoveName = hasTouch ? 'touchmove' : 'mousemove',
      evEndName = hasTouch ? ['touchend', 'touchcancel'] : ['mouseup', 'mousecancel'],

      vtracker = new VelocityTracker(),
      container = window,

      mDownPoint,
      mPrevPoint,

      dragging = false,
      isFirstDrag = false,

      noop = function () {},
      onDownCb = options.onUp || noop,
      onUpCb = options.onUp || noop,
      onDragCb = options.onDrag || noop,
      onFirstDragCb = options.onFirstDrag || noop,
      onFlingCb = options.onFling || noop;

  function getPoint (e) {
    if (hasTouch) {
      var t = (e.touches.length) ? e.touches : e.changedTouches;
      return { x: t[0].pageX,
               y: t[0].pageY,
               timestamp: e.timeStamp,
               e: e};
    } else {
      return { x: e.pageX,
               y: e.pageY,
               timestamp: e.timeStamp,
               e: e};
    }
  }

  function getDragData (point) {
    return { x: point.x,
             y: point.y,
             dx: point.x - mPrevPoint.x,
             dy: point.y - mPrevPoint.y,
             totaldx: point.x - mDownPoint.x,
             totaldy: point.y - mDownPoint.y,
             timestamp: point.timestamp,
             downPoint: mDownPoint,
             mPrevPoint: mPrevPoint,
             event: point.e
           };
  }

  var eventHandler = {
    handleEvent: function handleEvent(event) {
      switch (event.type) {
       case 'mousedown':
       case 'touchstart':
        this.onDown(event);
        break;
       case 'mousemove':
       case 'touchmove':
        this.onMove(event);
        break;
       case 'mouseup':
       case 'touchend':
        this.onUp(event);
        break;
      }
    },

    onDown: function onDown(e) {
      dragging = true;
      isFirstDrag = true;

      var p = getPoint(e);
      mDownPoint = p;
      mPrevPoint = p;
      vtracker.clear();
      vtracker.addMovement(p);
      onDownCb(e);
    },

    onMove: function onMove(e) {
      if (dragging) {
        var p = getPoint(e);
        vtracker.addMovement(p);
        var dragData = getDragData(p);

        if (isFirstDrag) {
          onFirstDragCb(dragData);
          isFirstDrag = false;
        }
        onDragCb(dragData);

        mPrevPoint = p;
      }

      return false;
    },

    onUp: function onUp(e) {
      window.scrollTo(0,window.scrollY);
      if (!dragging) { return; }
      var p = getPoint(e);
      var dragData = getDragData(p);
      if (dragging) {
        dragging = false;
        mPrevPoint = undefined;
        var velo = vtracker.getVelocity();
        onFlingCb(dragData, velo);
      }

      onUpCb();
    }
  };

  Events.add(elem, evStartName, eventHandler);
  Events.add(container, evMoveName, eventHandler);
  Events.add(container, evEndName, eventHandler);

  return {
    destroy: function destroy() {
      Events.remove(elem, evStartName, eventHandler);
      Events.remove(container, evMoveName, eventHandler);
      Events.remove(container, evEndName, eventHandler);
    },

    isDragging: function isDragging() {
      return dragging;
    },

    getVelocityTracker: function getVelocityTracker() {
      return vtracker;
    }
  };
}

module.exports = GestureDetector;

},{"./events":2,"./velocity_tracker":8}],5:[function(_dereq_,module,exports){
/*global module, clearTimeout, window*/
'use strict';

/** http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/ */
var lastTime = 0;
var vendors = ['webkit', 'moz'];
var x;

for (x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
  window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
  window.cancelAnimationFrame =
    window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = function (callback) {
    var currTime = new Date().getTime(),
        timeToCall = Math.max(0, 16 - (currTime - lastTime)),
        id = window.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  };
}

if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
}

module.exports.requestAnimationFrame = window.requestAnimationFrame.bind(window);
module.exports.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

},{}],6:[function(_dereq_,module,exports){
/*global require, module */
'use strict';

var console = _dereq_('./console');

/*
 * Port of Android Scroller http://developer.android.com/reference/android/widget/Scroller.html
 *
 * Copyright (C) 2006 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * <p>This class encapsulates scrolling. You can use scrollers ({@link Scroller}
 * or {@link OverScroller}) to collect the data you need to produce a scrolling
 * animation&mdash;for example, in response to a fling gesture. Scrollers track
 * scroll offsets for you over time, but they don't automatically apply those
 * positions to your view. It's your responsibility to get and apply new
 * coordinates at a rate that will make the scrolling animation look smooth.</p>
 *
 * <p>Here is a simple example:</p>
 *
 * <pre> private Scroller mScroller = new Scroller(context);
 * ...
 * public void zoomIn() {
 *     // Revert any animation currently in progress
 *     mScroller.forceFinished(true);
 *     // Start scrolling by providing a starting point and
 *     // the distance to travel
 *     mScroller.startScroll(0, 0, 100, 0);
 *     // Invalidate to request a redraw
 *     invalidate();
 * }</pre>
 *
 * <p>To track the changing positions of the x/y coordinates, use
 * {@link #computeScrollOffset}. The method returns a boolean to indicate
 * whether the scroller is finished. If it isn't, it means that a fling or
 * programmatic pan operation is still in progress. You can use this method to
 * find the current offsets of the x and y coordinates, for example:</p>
 *
 * <pre>if (mScroller.computeScrollOffset()) {
 *     // Get current x and y positions
 *     int currX = mScroller.getCurrX();
 *     int currY = mScroller.getCurrY();
 *    ...
 * }</pre>
 */
function Scroller(interpolator, flywheel) {

  var GRAVITY_EARTH = 9.80665;

  function currentAnimationTimeMillis() {
    return Date.now();
  }

  function signum(num) {
    return num ? num < 0 ? -1 : 1 :0;
  }

  /** private int */
  var mMode;

  /** private int */
  var mStartX;
  /** private int */
  var mStartY;
  /** private int */
  var mFinalX = 0;
  /** private int */
  var mFinalY = 0;

  /** private int */
  var mMinX;
  /** private int */
  var mMaxX;
  /** private int */
  var mMinY;
  /** private int */
  var mMaxY;

  /** {Number} 0-1, Scroll mode */
  var mProgress = 1;

  /** private int */
  var mCurrX = 0;
  /** private int */
  var mCurrY = 0;
  /** private long */
  var mStartTime;
  /** private int */
  var mDuration;
  /** private float */
  var mDurationReciprocal;
  /** private float */
  var mDeltaX;
  /** private float */
  var mDeltaY;
  /** private boolean */
  var mFinished;
  /** private Interpolator */
  var mInterpolator;
  /** private boolean */
  var mFlywheel;

  /** private float */
  var mVelocity;
  /** private float */
  var mCurrVelocity;
  /** private int */
  var mDistance;

  /** private float */
  var mFlingFriction = 0.015;

  /** private static final int */
  var DEFAULT_DURATION = 250;
  /** private static final int */
  var SCROLL_MODE = 0;
  /** private static final int */
  var FLING_MODE = 1;

  /** private static float */
  var DECELERATION_RATE = (Math.log(0.78) / Math.log(0.9));
  /** private static final float */
  var INFLEXION = 0.35; // Tension lines cross at (INFLEXION, 1)
  /** private static final float */
  var START_TENSION = 0.5;
  /** private static final float */
  var END_TENSION = 1.0;
  /** private static final float */
  var P1 = START_TENSION * INFLEXION;
  /** private static final float */
  var P2 = 1.0 - END_TENSION * (1.0 - INFLEXION);

  /** private static final int */
  var NB_SAMPLES = 100;
  /** private static final float[] */
  var SPLINE_POSITION = new Array(NB_SAMPLES + 1);
  /** private static final float[] */
  var SPLINE_TIME = new Array(NB_SAMPLES + 1);

  /** private float */
  var mDeceleration;
  /** private final float */
  var mPpi;

  /** A context-specific coefficient adjusted to physical values.
   private float */
  var mPhysicalCoeff;

  /** private static float */
  var sViscousFluidScale;
  /** private static float */
  var sViscousFluidNormalize;

  (function() {
    var x_min = 0.0;
    var y_min = 0.0;
    for (var i = 0; i < NB_SAMPLES; i++) {
      //final float
      var alpha = (i / NB_SAMPLES);

      var x_max = 1.0;
      var x, tx, coef;
      while (true) {
        x = x_min + (x_max - x_min) / 2.0;
        coef = 3.0 * x * (1.0 - x);
        tx = coef * ((1.0 - x) * P1 + x * P2) + x * x * x;
        if (Math.abs(tx - alpha) < 1E-5) break;
        if (tx > alpha) x_max = x;
        else x_min = x;
      }
      SPLINE_POSITION[i] = coef * ((1.0 - x) * START_TENSION + x) + x * x * x;

      var y_max = 1.0;
      var y, dy;
      while (true) {
        y = y_min + (y_max - y_min) / 2.0;
        coef = 3.0 * y * (1.0 - y);
        dy = coef * ((1.0 - y) * START_TENSION + y) + y * y * y;
        if (Math.abs(dy - alpha) < 1E-5) break;
        if (dy > alpha) y_max = y;
        else y_min = y;
      }
      SPLINE_TIME[i] = coef * ((1.0 - y) * P1 + y * P2) + y * y * y;
    }
    SPLINE_POSITION[NB_SAMPLES] = SPLINE_TIME[NB_SAMPLES] = 1.0;

    // This controls the viscous fluid effect (how much of it)
    sViscousFluidScale = 8.0;
    // must be set to 1.0 (used in viscousFluid())
    sViscousFluidNormalize = 1.0;
    sViscousFluidNormalize = 1.0 / viscousFluid(1.0);

  })();


  /**
   * Create a Scroller with the specified interpolator. If the interpolator is
   * null, the default (viscous) interpolator will be used. Specify whether or
   * not to support progressive "flywheel" behavior in flinging.
   */
  {
    mFinished = true;
    mInterpolator = interpolator;
    // mPpi = context.getResources().getDisplayMetrics().density * 160.0f;
    mPpi = 1 * 160;
    mDeceleration = computeDeceleration(mFlingFriction);
    mFlywheel = true; //flywheel; NOTE always flywheel

    mPhysicalCoeff = computeDeceleration(0.84); // look and feel tuning
  }

  /**
   * @param {Number} friction - float
   * @return {Number} - float
   */
  function computeDeceleration(friction) {
    return (GRAVITY_EARTH * // g (m/s^2)
            39.37 *         // inch/meter
            mPpi *          // pixels per inch
            friction);
  }

  /**
   * @param {Number} velocity - float
   * @return {Number} double
   */
  function getSplineDeceleration(velocity) {
    return Math.log(INFLEXION * Math.abs(velocity) / (mFlingFriction * mPhysicalCoeff));
  }

  /**
   * @param {Number} velocity - float
   * @return {Number} integer
   */
  function getSplineFlingDuration(velocity) {
    var l = getSplineDeceleration(velocity);
    var decelMinusOne = DECELERATION_RATE - 1.0;
    // NOTE (int) cast
    return Math.floor(1000.0 * Math.exp(l / decelMinusOne));
  }

  /**
   * @param {Number} velocity - float
   * @return {Number} double
   */
  function getSplineFlingDistance(velocity) {
    var l = getSplineDeceleration(velocity);
    var decelMinusOne = DECELERATION_RATE - 1.0;
    return mFlingFriction * mPhysicalCoeff * Math.exp(DECELERATION_RATE / decelMinusOne * l);
  }

  /**
   * @param {Number} x - float
   * @return {Number} float
   */
  function viscousFluid(x) {
    x *= sViscousFluidScale;
    if (x < 1.0) {
      x -= (1.0 - Math.exp(-x));
    } else {
      var start = 0.36787944117;   // 1/e === exp(-1)
      x = 1.0 - Math.exp(1.0 - x);
      x = start + x * (1.0 - start);
    }
    x *= sViscousFluidNormalize;
    return x;
  }



  /**
   * Returns the current velocity.
   *
   * @return {Number} - float. The original velocity less the
   * deceleration. Result may be negative.
   */
  function getCurrVelocity() {
    return mMode === FLING_MODE ?
      mCurrVelocity : mVelocity - mDeceleration * timePassed() / 2000.0;
  }

  /**
   * Returns the time elapsed since the beginning of the scrolling.
   *
   * @return {Number} - integer. The elapsed time in milliseconds.
   */
  function timePassed() {
    return currentAnimationTimeMillis() - mStartTime;
  }

  return {
    /**
     *
     * Returns whether the scroller has finished scrolling.
     *
     * @return {boolean} True if the scroller has finished scrolling,
     * false otherwise.
     */
    isFinished : function isFinished() {
      return mFinished;
    },


    /**
     * The amount of friction applied to flings. The default value
     * is {@link ViewConfiguration#getScrollFriction}.
     *
     * @param friction {Number} - float. A scalar dimension-less value
     *         representing the coefficient of friction.
     */
    setFriction : function setFriction(friction) {
      mDeceleration = computeDeceleration(friction);
      mFlingFriction = friction;
    },

    /**
     * Force the finished field to a particular value.
     *
     * @param finished {boolean} The new finished value.
     */
    forceFinished : function forceFinished(finished) {
      mFinished = finished;
    },

    /**
     * Returns how long the scroll event will take, in milliseconds.
     *
     * @return {Number} - integer. The duration of the scroll in milliseconds.
     */
    getDuration : function getDuration() {
      return mDuration;
    },

    /**
     * Returns the current X offset in the scroll.
     *
     * @return {Number} - integer. The new X offset as an absolute
     * distance from the origin.
     */
    getCurrX : function getCurrX() {
      return mCurrX;
    },

    /**
     * Returns the current Y offset in the scroll.
     *
     * @return {Number} - integer. The new Y offset as an absolute
     * distance from the origin.
     */
    getCurrY : function getCurrY() {
      return mCurrY;
    },

    /**
     * Returns the current progress 0-1 not interpolated. Only set for
     * scrolls not flings.
     *
     * @return {Number} - 0 start of animation 1 end of animation.
     */
    getProgress : function getProgress() {
      return mProgress;
    },

    /**
     * Returns the current velocity.
     *
     * @return The original velocity less the deceleration. Result may be
     * negative.
     */
    getCurrVelocity : getCurrVelocity,

    /**
     * Returns the start X offset in the scroll.
     *
     * @return {Number} - integer. The start X offset as an absolute
     * distance from the origin.
     */
    getStartX : function getStartX() {
      return mStartX;
    },

    /**
     * Returns the start Y offset in the scroll.
     *
     * @return {Number} - integer. The start Y offset as an absolute
     * distance from the origin.
     */
    getStartY : function getStartY() {
      return mStartY;
    },

    /**
     * Returns where the scroll will end. Valid only for "fling" scrolls.
     *
     * @return {Number} - integer. The final X offset as an absolute distance from the origin.
     */
    getFinalX : function getFinalX() {
      return mFinalX;
    },

    /**
     * Returns where the scroll will end. Valid only for "fling" scrolls.
     *
     * @return {Number} - integer. The final Y offset as an absolute
     * distance from the origin.
     */
    getFinalY : function getFinalY() {
      return mFinalY;
    },

    /**
     * Call this when you want to know the new location.
     * @return {boolean} If it true, the animation is not yet
     * finished.
     */
    computeScrollOffset : function computeScrollOffset() {
      if (mFinished) {
        return false;
      }

      var timePassed = Math.floor(currentAnimationTimeMillis() - mStartTime);

      // NOTE never let time run out?
      if (true || timePassed < mDuration) {
        switch (mMode) {
        case SCROLL_MODE:
          var x = timePassed * mDurationReciprocal;
          mProgress = x;
          if (mInterpolator === undefined) {
            x = viscousFluid(x);
          } else {
            x = mInterpolator(x);
          }

          mCurrX = mStartX + Math.round(x * mDeltaX);
          mCurrY = mStartY + Math.round(x * mDeltaY);

          // TODO fix decimal done checks, remove round
          if (Math.round(mCurrX) === Math.round(mFinalX) && Math.round(mCurrY) === Math.round(mFinalY)) {
            mCurrX = mFinalX;
            mCurrY = mFinalY;
            mProgress = 1;
            mFinished = true;
          }
          break;
        case FLING_MODE:
          var t = timePassed / mDuration;
          var index = Math.floor(NB_SAMPLES * t);
          var distanceCoef = 1.0;
          var velocityCoef = 0.0;
          if (index < NB_SAMPLES) {
            var t_inf = index / NB_SAMPLES;
            var t_sup = (index + 1) / NB_SAMPLES;
            var d_inf = SPLINE_POSITION[index];
            var d_sup = SPLINE_POSITION[index + 1];
            velocityCoef = (d_sup - d_inf) / (t_sup - t_inf);
            distanceCoef = d_inf + (t - t_inf) * velocityCoef;
          }

          mCurrVelocity = velocityCoef * mDistance / mDuration * 1000.0;

          mCurrX = mStartX + Math.round(distanceCoef * (mFinalX - mStartX));
          // Pin to mMinX <= mCurrX <= mMaxX
          mCurrX = Math.min(mCurrX, mMaxX);
          mCurrX = Math.max(mCurrX, mMinX);

          mCurrY = mStartY + Math.round(distanceCoef * (mFinalY - mStartY));
          // Pin to mMinY <= mCurrY <= mMaxY
          mCurrY = Math.min(mCurrY, mMaxY);
          mCurrY = Math.max(mCurrY, mMinY);

          // TODO fix decimal done checks, remove round
          if (Math.round(mCurrX) === Math.round(mFinalX) && Math.round(mCurrY) === Math.round(mFinalY)) {
            mCurrX = mFinalX;
            mCurrY = mFinalY;
            mProgress = 1;
            mFinished = true;
          }

          break;
        }
      } else {
        console.log('SCROLLER time ran out');
        mCurrX = mFinalX;
        mCurrY = mFinalY;
        mFinished = true;
      }
      return true;
    },

    /**
     * Start scrolling by providing a starting point, the distance to travel,
     * and the duration of the scroll.
     *
     * @param startX Starting horizontal scroll offset in pixels. Positive
     *        numbers will scroll the content to the left.
     * @param startY Starting vertical scroll offset in pixels. Positive numbers
     *        will scroll the content up.
     * @param dx Horizontal distance to travel. Positive numbers will scroll the
     *        content to the left.
     * @param dy Vertical distance to travel. Positive numbers will scroll the
     *        content up.
     * @param duration Duration of the scroll in milliseconds.
     */
    startScroll : function startScroll(startX, startY, dx, dy, duration) {
      if (duration === 0) {
        mFinished = true;
        mProgress = 1;
        mCurrX = startX + dx;
        mCurrY = startY + dy;
        return;
      }

      mMode = SCROLL_MODE;
      mFinished = false;
      mDuration = duration === undefined ? DEFAULT_DURATION : duration;
      mStartTime = currentAnimationTimeMillis();
      mProgress = 0;
      mStartX = startX;
      mStartY = startY;
      mFinalX = startX + dx;
      mFinalY = startY + dy;
      mDeltaX = dx;
      mDeltaY = dy;
      mDurationReciprocal = 1.0 / mDuration;
    },

    /**
     * Start scrolling based on a fling gesture. The distance travelled will
     * depend on the initial velocity of the fling.
     *
     * @param startX Starting point of the scroll (X)
     * @param startY Starting point of the scroll (Y)
     * @param velocityX Initial velocity of the fling (X) measured in pixels per
     *        second.
     * @param velocityY Initial velocity of the fling (Y) measured in pixels per
     *        second
     * @param minX Minimum X value. The scroller will not scroll past this
     *        point.
     * @param maxX Maximum X value. The scroller will not scroll past this
     *        point.
     * @param minY Minimum Y value. The scroller will not scroll past this
     *        point.
     * @param maxY Maximum Y value. The scroller will not scroll past this
     *        point.
     */
    fling : function fling(startX, startY, velocityX, velocityY,
                           minX, maxX, minY, maxY) {
      minX = (minX === undefined) ? -Number.MAX_VALUE : minX;
      minY = (minY === undefined) ? -Number.MAX_VALUE : minY;
      maxX = (maxX === undefined) ? Number.MAX_VALUE : maxX;
      maxY = (maxY === undefined) ? Number.MAX_VALUE : maxY;

      // Continue a scroll or fling in progress
      if (mFlywheel && !mFinished) {
        var oldVel = getCurrVelocity();

        var dx = (mFinalX - mStartX);
        var dy = (mFinalY - mStartY);
        var hyp = Math.sqrt(dx * dx + dy * dy);

        var ndx = dx / hyp;
        var ndy = dy / hyp;

        var oldVelocityX = ndx * oldVel;
        var oldVelocityY = ndy * oldVel;
        if (signum(velocityX) === signum(oldVelocityX) &&
            signum(velocityY) === signum(oldVelocityY)) {
          velocityX += oldVelocityX;
          velocityY += oldVelocityY;
        }
      }

      mMode = FLING_MODE;
      mFinished = false;

      var velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

      mVelocity = velocity;
      mDuration = getSplineFlingDuration(velocity);
      mStartTime = currentAnimationTimeMillis();
      mStartX = startX;
      mStartY = startY;

      var coeffX = velocity === 0 ? 1.0 : velocityX / velocity;
      var coeffY = velocity === 0 ? 1.0 : velocityY / velocity;

      var totalDistance = getSplineFlingDistance(velocity);
      // NOTE (int) cast
      mDistance = Math.floor(totalDistance * signum(velocity));

      mMinX = minX;
      mMaxX = maxX;
      mMinY = minY;
      mMaxY = maxY;

      mFinalX = startX + Math.round(totalDistance * coeffX);
      // Pin to mMinX <= mFinalX <= mMaxX
      mFinalX = Math.min(mFinalX, mMaxX);
      mFinalX = Math.max(mFinalX, mMinX);

      mFinalY = startY + Math.round(totalDistance * coeffY);
      // Pin to mMinY <= mFinalY <= mMaxY
      mFinalY = Math.min(mFinalY, mMaxY);
      mFinalY = Math.max(mFinalY, mMinY);
    },

    /**
     * Stops the animation. Contrary to {@link #forceFinished(boolean)},
     * aborting the animating cause the scroller to move to the final x and y
     * position
     *
     * @see #forceFinished(boolean)
     */
    abortAnimation : function abortAnimation() {
      mCurrX = mFinalX;
      mCurrY = mFinalY;
      mFinished = true;
    },

    /**
     * Extend the scroll animation. This allows a running animation to scroll
     * further and longer, when used with {@link #setFinalX(int)} or {@link #setFinalY(int)}.
     *
     * @param extend {Number} - integer. Additional time to scroll in milliseconds.
     * @see #setFinalX(int)
     * @see #setFinalY(int)
     */
    extendDuration : function extendDuration(extend) {
      var passed = timePassed();
      mDuration = passed + extend;
      if (mDuration === 0) {
        throw 'Extend caused duration to be 0';
      }
      mDurationReciprocal = 1.0 / mDuration;
      mFinished = false;
    },

    /**
     * Returns the time elapsed since the beginning of the scrolling.
     *
     * @return {Number} - integer. The elapsed time in milliseconds.
     */
    timePassed : timePassed,

    /**
     * Sets the final position (X) for this scroller.
     *
     * @param newX {Number} - integer. The new X offset as an absolute
     * distance from the origin.
     * @see #extendDuration(int)
     * @see #setFinalY(int)
     */
    setFinalX : function setFinalX(newX) {
      mFinalX = newX;
      mDeltaX = mFinalX - mStartX;
      mFinished = false;
    },

    /**
     * Sets the final position (Y) for this scroller.
     *
     * @param newY {Number} - integer. The new Y offset as an absolute
     * distance from the origin.
     * @see #extendDuration(int)
     * @see #setFinalX(int)
     */
    setFinalY : function setFinalY(newY) {
      mFinalY = newY;
      mDeltaY = mFinalY - mStartY;
      mFinished = false;
    },

    setInterpolator : function setInterpolator(interpolator) {
      mInterpolator = interpolator;
    },

    /**
     * @hide
     */
    isScrollingInDirection : function isScrollingInDirection(xvel, yvel) {
      return !mFinished && signum(xvel) === signum(mFinalX - mStartX) &&
        signum(yvel) === signum(mFinalY - mStartY);
    }
  };
}

module.exports = Scroller;

},{"./console":1}],7:[function(_dereq_,module,exports){
/*global module*/
'use strict';

module.exports = {
  /**
   * Clamp val between min and max
   */
  clamp: function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  /**
   * lerp a value [0-1] to new range [start-stop]
   */
  lerp: function lerp(value, start, stop) {
    return start + (stop - start) * value;
  },

  /**
   * map value in range [istart-istop] to range [ostart-ostop]
   * map(5, 0, 10, 0, 100) -> 50
   */
  map: function map(value, istart, istop, ostart, ostop) {
    return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
  },

  /**
   * map value in range [istart-istop] to range [ostart-ostop], clamp values between [ostart-ostop]
   * map(11, 0, 10, 0, 100) -> 100
   */
  mapClamp: function mapClamp(value, istart, istop, ostart, ostop) {
    return this.clamp(this.map(value, istart, istop, ostart, ostop),
                      ostart < ostop ? ostart : ostop, ostart < ostop ? ostop : ostart);
  },

  /**
   * roundTo(4, 10) -> 0
   * roundTo(5, 10) -> 10
   * roundTo(6, 10) -> 10
   * @param i {Number}
   * @param v {Number}
   * @return {Number}
   */
  roundTo: function roundTo(i, v) {
    return Math.round(i / v) * v;
  },

  /**
   * roundDownTo(13, 10) -> 10
   * roundDownTo(199, 100) -> 100
   * roundDownTo(99, 100) -> 0
   *
   * @param i {Number} value to round down
   * @param v {Number} round value down to closest even v
   * @return {Number}
   */
  roundDownTo: function roundDownTo(i, v) {
    return Math.floor(i / v) * v;
  },

  /**
   * roundUpTo(13, 10) -> 20
   * roundUpTo(199, 100) -> 200
   * roundUpTo(99, 100) -> 10
   * roundUpTo(-14, 10) -> -10
   *
   * @param i {Number} Value to round
   * @param v {Number} Round i up to closest even v
   * @return
   */
  roundUpTo: function roundUpTo(i, v) {
    return Math.ceil(i / v) * v;
  },

  /**
   * @param num {Number}
   * @return {Number} -1 if negative, 1 if positive, 0 otherwise
   */
  sign: function sign (num) {
    return num ? (num < 0) ? -1 : 1 : 0;
  }
};

},{}],8:[function(_dereq_,module,exports){
/*global require, module, console */
'use strict';

/*
 * Port of the Android VelocityTracker: http://code.metager.de/source/xref/android/4.4/frameworks/native/libs/input/VelocityTracker.cpp
 *
 * Original Licence
 *
 * Copyright (C) 2012 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function VelocityTracker() {
  /**
   * Threshold for determining that a pointer has stopped moving.
   * Some input devices do not send ACTION_MOVE events in the case where a pointer has
   * stopped.  We need to detect this case so that we can accurately predict the
   * velocity after the pointer starts moving again.
   */
  var ASSUME_POINTER_STOPPED_TIME_MS = 40;

  /** Max number of points to use in calculations */
  var HISTORY_SIZE = 5;

  /** If points are old don't use in calculations */
  var HORIZON_MS = 200;

  var DEBUG = false;

  /** Movement points to do calcs on */
  var positions = new Array(HISTORY_SIZE);

  var last_timestamp = 0;

  /** Index of latest added points in positions */
  var mIndex = 0;

  /** Estimator used */
  var estimator = new Estimator();

  function Estimator() {
    return {
      MAX_DEGREE: 4,
      // Estimator time base.
      time: 0,

      // Polynomial coefficients describing motion in X and Y.
      xCoeff: new Array(4 + 1), // MAX_DEGREE + 1
      yCoeff: new Array(4 + 1),

      // Polynomial degree (number of coefficients), or zero if no information is
      // available.
      degree: 2,

      // Confidence (coefficient of determination), between 0 (no fit) and 1 (perfect fit).
      confidence: 0,

      clear: function clear() {
        this.time = 0;
        this.degree = 0;
        this.confidence = 0;
        for (var i = 0; i <= this.MAX_DEGREE; i++) {
          this.xCoeff[i] = 0;
          this.yCoeff[i] = 0;
        }
      }
    };
  }

  function log(x) {
    console.log(
      JSON.stringify(x));
  }

  function vectorDot(va, vb) {
    var r = 0;
    var l = va.length;
    while (l--) {
      r += va[l] * vb[l];
    }
    return r;
  }

  function vectorNorm(va) {
    var r = 0;
    var i = va.length;
    while (i--) {
      r += va[i] * va[i];
    }
    return Math.sqrt(r);
  }

  function createTwoDimArray(m, n) {
    var x = new Array(m);
    for (var i = 0; i < m; i++) {
      x[i] = new Array(n);
    }
    return x;
  }

  function clear() {
    mIndex = 0;
    positions[0] = undefined;
  }

  /**
   * Solves a linear least squares problem to obtain a N degree polynomial that fits
   * the specified input data as nearly as possible.
   *
   * Returns true if a solution is found, false otherwise.
   *
   * The input consists of two vectors of data points X and Y with indices 0..m-1
   * along with a weight vector W of the same size.
   *
   * The output is a vector B with indices 0..n that describes a polynomial
   * that fits the data, such the sum of W[i] * W[i] * abs(Y[i] - (B[0] + B[1] X[i]
   * + B[2] X[i]^2 ... B[n] X[i]^n)) for all i between 0 and m-1 is minimized.
   *
   * Accordingly, the weight vector W should be initialized by the caller with the
   * reciprocal square root of the variance of the error in each input data point.
   * In other words, an ideal choice for W would be W[i] = 1 / var(Y[i]) = 1 / stddev(Y[i]).
   * The weights express the relative importance of each data point.  If the weights are
   * all 1, then the data points are considered to be of equal importance when fitting
   * the polynomial.  It is a good idea to choose weights that diminish the importance
   * of data points that may have higher than usual error margins.
   *
   * Errors among data points are assumed to be independent.  W is represented here
   * as a vector although in the literature it is typically taken to be a diagonal matrix.
   *
   * That is to say, the function that generated the input data can be approximated
   * by y(x) ~= B[0] + B[1] x + B[2] x^2 + ... + B[n] x^n.
   *
   * The coefficient of determination (R^2) is also returned to describe the goodness
   * of fit of the model for the given data.  It is a value between 0 and 1, where 1
   * indicates perfect correspondence.
   *
   * This function first expands the X vector to a m by n matrix A such that
   * A[i][0] = 1, A[i][1] = X[i], A[i][2] = X[i]^2, ..., A[i][n] = X[i]^n, then
   * multiplies it by w[i]./
   *
   * Then it calculates the QR decomposition of A yielding an m by m orthonormal matrix Q
   * and an m by n upper triangular matrix R.  Because R is upper triangular (lower
   * part is all zeroes), we can simplify the decomposition into an m by n matrix
   * Q1 and a n by n matrix R1 such that A = Q1 R1.
   *
   * Finally we solve the system of linear equations given by R1 B = (Qtranspose W Y)
   * to find B.
   *
   * For efficiency, we lay out A and Q column-wise in memory because we frequently
   * operate on the column vectors.  Conversely, we lay out R row-wise.
   *
   * http://en.wikipedia.org/wiki/Numerical_methods_for_linear_least_squares
   * http://en.wikipedia.org/wiki/Gram-Schmidt
   */
  function solveLeastSquares(x, y, w,
                             m, n, outB, outDet) {
    // indexes
    var h, i, j;

    if (DEBUG) {
      console.log("solveLeastSquares: ",
                  "m => ", m,
                  "n => ", n,
                  "x => ", x,
                  "y => ", y,
                  "w => ", w,
                  "outB =>", outB,
                  "outDet =>", outDet);
    }

    // Expand the X vector to a matrix A, pre-multiplied by the weights.
    // float a[n][m]; // column-major order
    var a = createTwoDimArray(n, m);
    for (h = 0; h < m; h++) {
      a[0][h] = w[h];
      for (i = 1; i < n; i++) {
        a[i][h] = a[i - 1][h] * x[h];
      }
    }
    if (DEBUG) {
      log({a : a});
    }

    // Apply the Gram-Schmidt process to A to obtain its QR decomposition.
    // float q[n][m]; // orthonormal basis, column-major order
    var q = createTwoDimArray(n, m);
    // float r[n][n]; // upper triangular matrix, row-major order
    var r = createTwoDimArray(n, n);
    for (j = 0; j < n; j++) {
      for (h = 0; h < m; h++) {
        q[j][h] = a[j][h];
      }
      for (i = 0; i < j; i++) {
        var dot = vectorDot(q[j], q[i]);
        for (h = 0; h < m; h++) {
          q[j][h] -= dot * q[i][h];
        }
      }

      var norm = vectorNorm(q[j], m);
      if (DEBUG) {
        log({q : q});
        console.log('norm', norm, m, q[j][0]);
      }
      if (norm < 0.000001) {
        // vectors are linearly dependent or zero so no solution
        if (DEBUG) {
          console.log("  - no solution, norm=%f", norm);
        }
        return false;
      }

      var invNorm = 1.0 / norm;
      for (h = 0; h < m; h++) {
        q[j][h] *= invNorm;
      }
      for (i = 0; i < n; i++) {
        r[j][i] = i < j ? 0 : vectorDot(q[j], a[i]);
      }
    }

    if (DEBUG) {
      console.log("  - q=> ", q[0][0]);
      console.log("  - r=> ", r[0][0]);

      // calculate QR, if we factored A correctly then QR should equal A
      var qr = createTwoDimArray(n, m);
      for (h = 0; h < m; h++) {
        for (i = 0; i < n; i++) {
          qr[i][h] = 0;
          for (j = 0; j < n; j++) {
            qr[i][h] += q[j][h] * r[j][i];
          }
        }
      }
      console.log("  - qr=%s",qr[0][0]);
    } // End DEBUG

    // Solve R B = Qt W Y to find B.  This is easy because R is upper triangular.
    // We just work from bottom-right to top-left calculating B's coefficients.
    var wy = new Array(m);
    for (h = 0; h < m; h++) {
      wy[h] = y[h] * w[h];
    }
    for (i = n; i-- !== 0; ) {
      outB[i] = vectorDot(q[i], wy, m);
      for (j = n - 1; j > i; j--) {
        outB[i] -= r[i][j] * outB[j];
      }
      outB[i] /= r[i][i];
    }

    if (DEBUG) {
      console.log("  - b=%s", outB);
    }

    // Calculate the coefficient of determination as 1 - (SSerr / SStot) where
    // SSerr is the residual sum of squares (variance of the error),
    // and SStot is the total sum of squares (variance of the data) where each
    // has been weighted.
    var ymean = 0;
    for (h = 0; h < m; h++) {
      ymean += y[h];
    }
    ymean /= m;

    var sserr = 0;
    var sstot = 0;
    for (h = 0; h < m; h++) {
      var err = y[h] - outB[0];
      var term = 1;
      for (i = 1; i < n; i++) {
        term *= x[h];
        err -= term * outB[i];
      }
      sserr += w[h] * w[h] * err * err;
      var vari = y[h] - ymean;
      sstot += w[h] * w[h] * vari * vari;
    }
    outDet.confidence = sstot > 0.000001 ? 1.0 - (sserr / sstot) : 1;

    if (DEBUG) {
      console.log(
        "  - sserr => ", sserr,
        "  - sstot => ", sstot,
        "  - det => ", outDet
      );
    }
    return true;
  }

  function chooseWeight(index) {
    // TODO
    return 1;
  }

  /**
   * @param degree Order use 2...
   */
  function prepareEstimator(degree) {
    estimator.clear();

    // Iterate over movement samples in reverse time order and collect samples.
    var x = new Array(HISTORY_SIZE);
    var y = new Array(HISTORY_SIZE);
    var w = new Array(HISTORY_SIZE);
    var time = new Array(HISTORY_SIZE);
    var m = 0;
    var index = mIndex;
    var newestMovement = positions[mIndex];
    if (newestMovement === undefined) {
      return false;
    }
    do {
      var movement = positions[index];
      if (!movement) {
        break;
      }

      var age = newestMovement.timestamp - movement.timestamp;
      if (age > HORIZON_MS) {
        break; // Old points don't use
      }

      x[m] = movement.x;
      y[m] = movement.y;
      w[m] = chooseWeight(index);
      time[m] = -age;
      index = (index === 0 ? HISTORY_SIZE : index) - 1;
    } while (++m < HISTORY_SIZE);

    if (m === 0) {
      console.log('no data to estimate');
      return false; // no data
    }

    // Calculate a least squares polynomial fit.
    if (degree > m - 1) {
      degree = m - 1;
    }
    if (degree >= 1) {
      // TODO change xdet, ydet to be returned from function
      var xdet = {confidence: 0};
      var ydet = {confidence: 0};
      var n = degree + 1;
      if (solveLeastSquares(time, x, w, m, n, estimator.xCoeff, xdet) &&
          solveLeastSquares(time, y, w, m, n, estimator.yCoeff, ydet)) {
        estimator.time = newestMovement.timestamp;
        estimator.degree = degree;
        estimator.confidence = xdet.confidence * ydet.confidence;

        if (DEBUG) {
          console.log("Estimate: ",
                      "degree", estimator.degree,
                      "xCoeff", estimator.xCoeff,
                      "yCoeff", estimator.yCoeff,
                      "confidence", estimator.confidence);
        }
        return true;
      }
    }

    // No velocity data available for this pointer, but we do have its current position.
    if (DEBUG) {
      console.log("velocity data available for this pointer, but we do have its current position.");
    }
    estimator.xCoeff[0] = x[0];
    estimator.yCoeff[0] = y[0];
    estimator.time = newestMovement.timestamp;
    estimator.degree = 0;
    estimator.confidence = 1;
    return true;
  }

  return {
    clear: clear,

    getVelocity: function getVelocity() {
      // 2 polynomial estimator
      if (prepareEstimator(2) && estimator.degree >= 1) {
        return {
          unit: "px / ms",
          vx: estimator.xCoeff[1],
          vy: estimator.yCoeff[1]
        };
      }
      return {
        info: 'no velo',
        unit: "px / ms",
        vx: 0,
        vy: 0
      };
    },

    getPositions: function getPositions() {
      var m = 0;
      var index = mIndex;
      var r = [];
      do {
        var movement = positions[index];
        if (!movement) {
          break;
        }
        r.push(movement);
        index = (index === 0 ? HISTORY_SIZE : index) - 1;
      } while (++m < HISTORY_SIZE);

      return r;
    },

    /**
     * @param pos = {x, y, timestamp_ms}
     */
    addMovement: function addMovement(pos) {
      if (pos.timestamp >= last_timestamp + ASSUME_POINTER_STOPPED_TIME_MS) {
        // We have not received any movements for too long.  Assume that all pointers
        // have stopped.
        if (DEBUG) {
          console.log('no movements assume stop');
        }
        clear();
      }
      last_timestamp = pos.timestamp;

      // strategy add
      if (++mIndex === HISTORY_SIZE) {
        mIndex = 0;
      }

      positions[mIndex] = pos;
    }
  };
}

module.exports = VelocityTracker;

},{}]},{},[3])
(3)
});
