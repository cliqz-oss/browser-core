var done = false;

function get_dom(){
	if(done) {
		return
	}

	// Need to parse here and send it to the background.
	let _ad = '';
	let _h = false;

	let adDetails = {};
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


	// We need to get all the ADS from this page.
	let doc = document;
	let noAdsOnThisPage = 0;
	let detectAdRules = {
	    query: {
	        element: '#ires',
	        attribute: 'data-async-context'
	    },
	    adSections: ['.ads-ad', '.pla-unit-container', '.pla-hovercard-content-ellip'],
	    0: {
	        cu: ".ad_cclk h3 a[id^='s0p'],.ad_cclk h3 a[id^='s3p']",
	        fu: ".ad_cclk h3 a[id^='vs0p'],.ad_cclk h3 a[id^='vs3p']"
	    },
	    1: {
	        cu: "a[id^='plaurlg']",
	        fu: "a[id^='vplaurlg']"
	    },
	    2: {
	        cu: "a[id^='plaurlh']",
	        fu: "a[id^='vplaurlh']"
	    }
	};


    // We need to scrape the query too.
    let queryElement = doc.querySelector(detectAdRules.query.element);
    let query = "";

    if (queryElement) {
        query = queryElement.getAttribute(detectAdRules.query.attribute).replace('query:','');

	    try {
	      query = decodeURIComponent(query);
	    } catch(ee) {}
	}

    // Let's iterate over each possible section of the ads.
    detectAdRules.adSections.forEach( (eachAdSection, idx) => {
        let adNodes;
        adNodes = Array.prototype.slice.call(doc.querySelectorAll(eachAdSection));

        adNodes.forEach( eachAd => {
            let cuRule = detectAdRules[idx]['cu'];
            let fuRule = detectAdRules[idx]['fu'];



            let clink = eachAd.querySelector(cuRule);
            let flink = eachAd.querySelector(fuRule);

            if (clink && flink) {

                let clickPattern = clink.href.split('aclk?')[1];
                //CliqzHumanWeb.ads.push(clickPattern);


                adDetails[clickPattern] = {
                    ts: Date.now(),
                    query: query,
                    furl: [flink.getAttribute('data-preconnect-urls'), flink.href] // At times there is a redirect chain, we only want the final domain.
                };

        		noAdsOnThisPage++;
            }

        });

    });

    if (noAdsOnThisPage > 0) {
		var adCtrMessage = {
			"type": "ad-ctr",
			"ads": adDetails
		};

		// chrome.runtime.connect().postMessage(additionalInfo);
		chrome.runtime.sendMessage(adCtrMessage);
	}

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
