/* global window, document, CLIQZ, ChromeUtils */
import { getMessage } from '../core/i18n';

const telemetry = {
  type: 'anti-phishing',
  action: 'click',
  target: null
};

// gets all the elements with the class 'cliqz-locale' and adds
// the localized string - key attribute - as content
function localizeDoc(doc) {
  const locale = doc.getElementsByClassName('cliqz-locale');
  for (let i = 0; i < locale.length; i += 1) {
    const el = locale[i];
    el.textContent = getMessage(el.getAttribute('key'));
  }
}

function getURL() {
  let url = document.documentURI;
  const match = url.match(/u=([^&]+)/);

  if (!match) {
    return ''; // this should not happend though
  }

  url = decodeURIComponent(match[1]);
  return url;
}

function format() {
  (ChromeUtils.import || Components.utils.import)('chrome://cliqzmodules/content/CLIQZ.jsm');

  // bundling made System imports obsolete so temporary
  // moving towards a more "nasty" way of importing
  const CliqzUtils = CLIQZ.CliqzUtils;
  const hw = CLIQZ.app.modules['human-web'].background.humanWeb;
  const CliqzAntiPhishing = CLIQZ.app.modules['anti-phishing'].background.CliqzAntiPhishing;
  const freshtab = CLIQZ.app.modules.freshtab && CLIQZ.app.modules.freshtab.background;

  // get phishing url
  const url = getURL();

  // urlbar
  const urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
  urlbar.textValue = url;
  urlbar.value = url;
  urlbar.mInputField.value = url;

  // i18n
  localizeDoc(document);

  // update messages
  document.getElementById('phishing-url').innerText = url;

  // update buttons
  // safe out
  document.getElementsByClassName('cqz-button-save-out')[0].onclick = () => {
    telemetry.target = 'safe_out';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'safe_out';
    }
    let safeUrl;
    if (freshtab && freshtab.newTabPage && freshtab.newTabPage.isActive) {
      safeUrl = CLIQZ.config.settings.NEW_TAB_URL;
    } else {
      safeUrl = 'about:newtab';
    }
    window.location.replace(safeUrl);
  };

  // learn more
  document.getElementById('learn-more').onclick = () => {
    telemetry.target = 'learn_more';
    CliqzUtils.telemetry(telemetry);
  };

  // proceed at risk
  document.getElementById('proceed').onclick = () => {
    telemetry.target = 'ignore';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'report';
    }
    CliqzAntiPhishing.whitelistTemporary(url);
    window.location.replace(url);
  };

  // report as safe
  document.getElementById('report-safe').onclick = () => {
    telemetry.target = 'report';
    CliqzUtils.telemetry(telemetry);
    if (hw && hw.state.v[url]) {
      hw.state.v[url]['anti-phishing'] = 'report';
    }
    CliqzAntiPhishing.markAsSafe(url);
    window.location.replace(url);
  };
}

format();
