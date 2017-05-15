var done = false;

function get_dom(){
	if(done) {
		return
	}

	// Need to parse here and send it to the background.
	let _ad = '';
	let _h = false;

	if (document.querySelector('#s0p1c0')) {
		_ad = document.querySelector('#s0p1c0').href;
	}

	if (document.querySelector('#tads .ads-ad')) {
		if (document.querySelector('#tads .ads-ad').offsetParent === null) _h = true;
	}

	var additionalInfo = {
	  "type": "dom",
	  "title": document.title,
	  "html": document.getElementsByTagName('html')[0].innerHTML,
	  "ad": _ad,
	  "hidden": _h
	};

	// chrome.runtime.connect().postMessage(additionalInfo);
	chrome.runtime.sendMessage(additionalInfo);

	// Add event listeners
	var events = ["keypress","mousemove","mousedown","scroll","copy"];
	events.forEach( e=> {
		document.addEventListener(e, function(ev){
			var signal = {};
			signal["type"] = "event_listener";
			signal["action"] = e;
			signal["baseURI"] = ev.target.baseURI;
			if (ev.target.href != null || ev.target.href != undefined) {
				signal["targetHref"] = ev.target.href;
			}
			// chrome.runtime.connect().postMessage(signal);
			chrome.runtime.sendMessage(signal);
		})
	})
	done = true;
	// alert(document.querySelector('#tads .ads-ad a').href);
}

window.addEventListener("load",get_dom);
window.setTimeout(get_dom, 2000);
