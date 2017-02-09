'use strict';

function DelayedImageLoader(selector) {
  this.DELAY = 500;
  this.BANDWITH = 2;

  this.selector = selector;
}

DelayedImageLoader.prototype = {

  start: function() {
    this.timeout = setTimeout(this.loadFirstBatch.bind(this), this.DELAY);
  },

  stop: function() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.isRunning = false;
  },

  loadFirstBatch: function() {
    this.isRunning = true;
    // TODO: Move loading of images to constructor. But make sure that DOM exists when constructor is called.
    this.elements = Array.prototype.slice.call(document.querySelectorAll(this.selector));
    this.inProcess = this.elements.length;
    if(this.inProcess === 0) {
      window.dispatchEvent(new CustomEvent("imgLoadingDone"));
      return;
    }
    Array.apply(null, Array(this.BANDWITH)).forEach(this.loadNext.bind(this));
  },

  loadNext: function () {
    var self = this;
    function safeLoadNext() {
        self.inProcess--;
        if(self.inProcess <= 0) {
          window.dispatchEvent(new CustomEvent("imgLoadingDone"));
          return;
        }
        self.loadNext();
      };

    var el = self.elements.shift();
    if(!self.isRunning) {
      return;
    }
    if (!el) {
      return;
    }

    if (el.dataset.src) {

      // TODO: onerror should show default error img
      el.onload = el.onerror = safeLoadNext;
      el.src = el.dataset.src;
    } else if (el.dataset.style) {
      var url = self.getBackgroundImageUrlFromStyle(el.dataset.style),
          img = new Image();
      // TODO: onerror should show default error img
      img.onload = function () {
        el.setAttribute('style', el.dataset.style);
        safeLoadNext();
      }
      img.onerror = function () {
        el.setAttribute('style', "display: none;");
        safeLoadNext();
      }
      img.src = url;
    }
  },

  getBackgroundImageUrlFromStyle: function (style) {
    var match = style.match(/background-image:\s*url\(([^\)]*)\)/);
    return (match && match.length === 2) ? match[1] : '';
  }
};

export default DelayedImageLoader;
