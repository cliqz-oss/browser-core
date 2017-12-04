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

  // bundling made System imports obsolete so temporary
  // moving towards a more "nasty" way of importing
  var CliqzUtils = CLIQZ.CliqzUtils;
  var hw = CLIQZ.app.modules['human-web'].background.humanWeb;
  var CliqzAntiPhishing = CLIQZ.app.modules['anti-phishing'].background.CliqzAntiPhishing;
  var freshtab = CLIQZ.app.modules['freshtab'] && CLIQZ.app.modules['freshtab'].background;

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
    var safeUrl;
    if (freshtab && freshtab.newTabPage && freshtab.newTabPage.isActive) {
      safeUrl = CLIQZ.config.settings.NEW_TAB_URL;
    } else {
      safeUrl = 'about:newtab';
    }
    window.location.replace(safeUrl);
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
