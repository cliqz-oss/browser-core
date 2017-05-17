var done = false;

function get_dom(){
	if(done) {
		return
	}
	var additionalInfo = {
	  "type": "dom",
	  "title": document.title,
	  "html": document.getElementsByTagName('html')[0].innerHTML
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
}

window.addEventListener("load",get_dom);
window.setTimeout(get_dom, 2000);
