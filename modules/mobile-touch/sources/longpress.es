/* global CLIQZEnvironment */
/**
* @namespace mobile-touch
*/
export default class {
  /**
  * @class Longpress
  * @constructor
  * @param settings
  * @param longpressCallback
  * @param tapCallback
  */
	constructor(elements, longpressCallback, tapCallback) {
		const self = this;
		this.touchTimer = undefined;
		this.isTapBlocked = false;

		function clearTimer () {
		  clearTimeout(self.touchTimer);
		  self.touchTimer = null;
		}



		CLIQZEnvironment.addEventListenerToElements(elements, 'touchstart', function () {
			self.touchTimer = setTimeout(function(context) {
			  clearTimer();
			  longpressCallback(context);
			}, 500, this);
		});

		CLIQZEnvironment.addEventListenerToElements(elements, 'touchend', function () {
		    if(self.touchTimer) {
		      clearTimer();
		      tapCallback(this);
		    } else if(self.isTapBlocked) {
		      self.isTapBlocked = false;
		    }
		});

		CLIQZEnvironment.addEventListenerToElements(elements, 'touchmove', function () {
			self.isTapBlocked = true;
		    clearTimer();
		});
	}
}
