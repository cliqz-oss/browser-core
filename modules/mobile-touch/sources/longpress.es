/* global CLIQZEnvironment */

export default class {

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