var WARNINGURL = 'chrome://cliqz/content/anti-phishing/phishing-warning.html?u=';

function isPhishingUrl(url, windowId, send) {
  if (!url.startsWith('http')) {
    return;
  }
  let payload = {
    module: 'anti-phishing',
    action: 'isPhishingURL',
    args: [url]
  }

  send({
    windowId,
    payload
  })
}

function responseAntiPhishingMsg(msg, window) {
  if (msg.data && msg.data.response && msg.data.response.type === 'phishingURL') {
    if (msg.data.response.block) {
      window.location = WARNINGURL + encodeURIComponent(window.location);
    }
  }
}
