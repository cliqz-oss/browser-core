var telemetry = {
  type: 'anti-phishing',
  action: 'click',
  target: null
};

function getURL() {
  var url = document.documentURI;
  var match = url.match(/u=([^&]+)/);

  if (!match) {
    return '';  // this should not happend though
  }

  url = decodeURIComponent(match[1]);
  return url;
}

function format() {
  Components.utils.import('chrome://cliqzmodules/content/CLIQZ.jsm');
	var CliqzUtils = CLIQZ.CliqzUtils;
  var hw = CLIQZ.System.get('human-web/human-web').default;
  var CliqzAntiPhishing = CLIQZ.System.get('anti-phishing/anti-phishing').default;
  var config = CLIQZ.System.get('core/config').default;


  // get phishing url
  var url = getURL();

  // urlbar
  var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
	urlbar.textValue = url;
	urlbar.value = url;
	urlbar.mInputField.value = url;

  // i18n
  CliqzUtils.localizeDoc(document);

  // update messages
  document.getElementById('phishing-url').innerText = url;

  // update buttons
  // safe out
  document.getElementsByClassName('cqz-button-save-out')[0].onclick = function() {
    telemetry.target = 'safe_out';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'safe_out';
    }
    window.location.replace(config.settings.NEW_TAB_URL);
  }

  // learn more
  document.getElementById('learn-more').onclick = function() {
    telemetry.target = 'learn_more';
    CliqzUtils.telemetry(telemetry);
  }

  // proceed at risk
  document.getElementById('proceed').onclick = function() {
    telemetry.target = 'ignore';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'report';
    }
    CliqzAntiPhishing.whitelistTemporary(url);
    window.location.replace(url);
  }

  // report as safe
  document.getElementById('report-safe').onclick = function() {
    telemetry.target = 'report';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'report';
    }
    CliqzAntiPhishing.markAsSafe(url);
    window.location.replace(url);
  }
}

format();
