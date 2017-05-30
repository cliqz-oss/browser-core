/*
 * This module allows selected web pages to interact with the CLIQZ
 * extension, for example, to open the dropdown or to imulate typing
 * a query. To this end, this module exports a set of functions by
 * attaching these functions to an element in the DOM of the target
 * web page.
 *
 * Example usage on web page (needs to be under cliqz.com domain):
 * 		<a id="cliqzDemoProxy" href="#"
 *		 onclick="cliqzDemoProxy.demoQuery('wetter in frankfurt');"
 *		 style="visibility: collapse;">DEMO</a>
 *
 */

import utils from 'core/utils';

var PROXY_ID = "cliqzDemoProxy",
	FAKE_CURSOR_ID = "CliqzDemoCursor",
	TYPING_INTERVAL = 1000.0 / 10;

function _log(msg) {
	utils.log(msg, 'CliqzDemo');
}

function _sendTelemetrySignal(action) {
	var signal = {
		type: "demo",
		url: utils.getWindow().gBrowser.selectedBrowser.currentURI.spec,
		action: action
	};

	utils.telemetry(signal);
}

function _onPageLoad (aEvent) {
	var doc = aEvent.target;

	if (doc.nodeName != "#document") return;
	var details = utils.getDetailsFromUrl(doc.location.toString());
	if (!(details.name == "cliqz" && details.tld == "com")) return;

	var proxy = doc.getElementById(PROXY_ID);
	if (proxy && Cu.exportFunction) {
		Cu.exportFunction(CliqzDemo.demoQuery, proxy, {  defineAs: "demoQuery" });
		Cu.exportFunction(CliqzDemo.demoQueryAndClicking, proxy, {  defineAs: "demoQueryAndClicking" });

		proxy.style.visibility = 'visible';
		_sendTelemetrySignal("show");
	}
}

function _createFakeCursor (win) {
	var callout = win.document.createElement("panel"),
		content = win.document.createElement("div"),
		parent = win.CLIQZ.Core.popup.parentElement;

	callout.className = "onboarding-container";
	content.className = "onboarding-cursor";

	callout.setAttribute("id", FAKE_CURSOR_ID);
	callout.setAttribute("level", "top");
	callout.setAttribute("noautofocus", "true");
	callout.setAttribute("noautohide", "false");

	callout.appendChild(content);
	parent.appendChild(callout);

	return callout;
}

function _getFakeCursor(win) {
	 return win && win.document.getElementById(FAKE_CURSOR_ID);
}

function _destroyFakeCursor(win) {
	var cursor = _getFakeCursor(win);
	if(cursor)
		cursor.parentNode.removeChild(cursor);
}

function _dropdownHiddenListener() {
	var win = utils.getWindow(),
		cursor = _getFakeCursor(win);

	if (cursor && cursor.state == "open") {
		cursor.hidePopup();
	}
}

var initialized = false;

var CliqzDemo = {
	init: function (win) {
    if(utils.getPref("cliqz_core_disabled", false) || !win.CLIQZ.Core.popup) return;

		win.gBrowser.addEventListener("DOMContentLoaded", _onPageLoad, false);
    if (win.CLIQZ) {
  		win.CLIQZ.Core.popup.
  			addEventListener("popuphidden", _dropdownHiddenListener, false);
  		_createFakeCursor(win);

      initialized = true;
    }
	},
	unload: function (win) {
    if(!initialized) return;

		win.gBrowser.removeEventListener("DOMContentLoaded", _onPageLoad, false);
		win.CLIQZ.Core.popup.
			removeEventListener("popuphidden", _dropdownHiddenListener, false);
		_destroyFakeCursor(win);
	},


	demoQuery: function (query) {
		CliqzDemo.clearDropdown();
		CliqzDemo.openDropdown();
		CliqzDemo.typeInUrlbar(query);

		_sendTelemetrySignal("start");
	},
	demoQueryAndClicking: function (query) {
		CliqzDemo.clearDropdown();
		CliqzDemo.openDropdown();
		CliqzDemo.typeInUrlbar(query);

		utils.setTimeout(function () {
			CliqzDemo.demoClicking();
		}, TYPING_INTERVAL * query.length + 750);

		_sendTelemetrySignal("start");
	},


	demoClicking: function () {
		var win = utils.getWindow(),
			cursor = _getFakeCursor(win);

		cursor.classList.remove("pulsate");
		cursor.openPopup(
			win.CLIQZ.Core.popup.cliqzBox.resultsBox, "overlap", 160, 55);
		cursor.classList.add("pulsate");
	},
	clearDropdown: function () {
		var results =
			utils.getWindow().CLIQZ.Core.popup.cliqzBox.resultsBox;

		while (results.firstChild) {
			results.removeChild(results.firstChild);
		}
	},
	openDropdown: function () {
		var core = utils.getWindow().CLIQZ.Core;
		core.popup._openAutocompletePopup(core.urlbar, core.urlbar);
	},
	typeInUrlbar: function (text, pos, core) {
		if (!pos) {
			pos = 0;
		}

		if (!core) {
			core = utils.getWindow().CLIQZ.Core;
			core.urlbar.focus();
		}

		if (pos < text.length) {
			utils.setTimeout(function() {
				core.urlbar.mInputField.setUserInput(text.substr(0, ++pos));
				CliqzDemo.typeInUrlbar(text, pos, core);
			}, TYPING_INTERVAL);
		}
	}
}

export default CliqzDemo;
