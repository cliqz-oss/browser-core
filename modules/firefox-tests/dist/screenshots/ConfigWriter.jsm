'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['ConfigWriter'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/Task.jsm');
Cu.import('resource://gre/modules/osfile.jsm');

Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
var CliqzUtils = CLIQZ.CliqzUtils;

const BRAND_SHORT_NAME = Cc["@mozilla.org/intl/stringbundle;1"]
                        .getService(Ci.nsIStringBundleService)
                        .createBundle("chrome://branding/locale/brand.properties")
	                    .GetStringFromName("brandShortName");


var ConfigWriter = {
	writeFileToDownloads: function(args) {
		return serializeData(args).then(saveToFile);
	}
};


function serializeData(args) {
	return Promise.resolve({
		data: JSON.stringify(args.data),
		filename: args.filename

	});
}


function saveScreenshot(args) {
    return saveToFile(args).then(function () { return Promise.resolve(args) });
}


function saveToFile(args) {
	return Task.spawn(function*() {
		try {
			Downloads.getPreferredDownloadsDirectory().then(function(dirpath) {

				let encoder = new TextEncoder();
				let d = encoder.encode(args.data);
				let promise = OS.File.writeAtomic(
					OS.Path.join(dirpath, args.filename),
					d,
					{tmpPath: args.filename + ".tmp"}
				);
			});
		}
		catch (ex) {
			CliqzUtils.log(ex);
		}
	});
}
