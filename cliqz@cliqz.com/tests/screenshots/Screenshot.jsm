'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['Screenshot'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Downloads.jsm');
Cu.import('resource://gre/modules/devtools/LayoutHelpers.jsm');
Cu.import('resource://gre/modules/Task.jsm');
Cu.import('resource://gre/modules/osfile.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

const BRAND_SHORT_NAME = Cc["@mozilla.org/intl/stringbundle;1"]
                        .getService(Ci.nsIStringBundleService)
                        .createBundle("chrome://branding/locale/brand.properties")
	                    .GetStringFromName("brandShortName");

 // String used as an indication to generate default file name in the following
 // format: "Screen Shot yyyy-mm-dd at HH.MM.SS.png"
 const FILENAME_DEFAULT_VALUE = " ";

//http://mxr.mozilla.org/mozilla-central/source/toolkit/devtools/gcli/commands/screenshot.js
var Screenshot = {
	exec: function(args) {
		return createScreenshotData(CliqzUtils.getWindow(),args).then(saveScreenshot);
	}
};

function createScreenshotData(document, args) {
	const window = document;
	let left = 0;
	let top = 0;
	let width;
	let height;
	const currentX = window.scrollX;
	const currentY = window.scrollY;

	if(args && args.fullpage) {
		window.scrollTo(0, 0);
		width = window.innerWidth + window.scrollMaxX;
		height = window.innerHeight + window.scrollMaxY;
	} else {
		left = window.scrollX;
		top = window.scrollY;
		width = window.innerWidth;
		height = window.innerHeight;
	}

	const winUtils = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIDOMWindowUtils);
  const scrollbarHeight = {};
  const scrollbarWidth = {};
	winUtils.getScrollbarSize(false, scrollbarWidth, scrollbarHeight);
	width -= scrollbarWidth.value;
	height -= scrollbarHeight.value;

	const canvas = window.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
	const ctx = canvas.getContext("2d");
	const ratio = window.devicePixelRatio;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.drawWindow(window, left, top, width, height, "#fff");
  const data = canvas.toDataURL("image/png", "");

  if(args && args.fullpage) {
  	window.scrollTo(currentX, currentY);
  }

  return Promise.resolve({
		destinations: [],
		data: data,
    height: height,
		width: width,
		filename: getFilename(args.filename),
	});
}

function saveScreenshot(reply) {
	return saveToFile(reply).then(function () { return Promise.resolve(reply) });
}

function saveToFile(reply) {

	return Task.spawn(function*() {
		try {
			//let document = window.document;
			let w = CliqzUtils.getWindow();
			let d = CliqzUtils.getWindow().document;
			let filename = reply.filename;

			//Check if there is a .png extension to filename
			if (!filename.match(/.png$/i)) {
				filename += ".png";
			}

			w.saveURL(reply.data, filename, null,
						   true /*aShouldBypassCache */, true /* aSkipPrompt */,
						   d.documentURIObject, d);			
		}
		catch (ex) {
			CliqzUtils.log(ex);
		}
	});
}

function getFilename(defaultName) {
	// Create a name for the file if not present
	if (defaultName != FILENAME_DEFAULT_VALUE) {
		return defaultName;
	}
 
	const date = new Date();
	let dateString = date.getFullYear() + "-" + (date.getMonth() + 1) +
                   "-" + date.getDate();
	dateString = dateString.split("-").map(function(part) {
	if (part.length == 1) {
		part = "0" + part;
	}
	return part;
	}).join("-");
 
	const timeString = date.toTimeString().replace(/:/g, ".").split(" ")[0];
	return l10n.lookupFormat("screenshotGeneratedFilename",
                            [ dateString, timeString ]) + ".png";
}
