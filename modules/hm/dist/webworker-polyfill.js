//This should make it easier to use System.import to import ES6 modules into workers.
//Of course, any usage of Services/CliqzUtils or other globals not present here needs to be
//addressed

importScripts("chrome://cliqzmodules/content/extern/system-polyfill.js");
System.baseURL = 'chrome://cliqz/content/';
Services = {
	scriptloader:{
		loadSubScript: function(src, context) {
			if (context !== self) {
				throw new Error('loadSubScript: context is not global context');
			}
			importScripts(src);
		}
	}
};

CliqzUtils = {
	log:console.log.bind(console),
	setTimeout:setTimeout.bind(self),
	clearTimeout:clearTimeout.bind(self),
	setInterval:setInterval.bind(self),
	clearInterval:clearInterval.bind(self),
};

Components = {
	utils: {
		import: function(src) {
			switch (src.trim()) {
				case 'resource://gre/modules/Services.jsm':
					return Services;
				default:
					throw new Error('Components.utils.import: file not found ' + src);
			}
		}
	}
};