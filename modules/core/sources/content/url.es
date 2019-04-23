
export function isCliqzAction(url) {
  return url.match(/^cliqz-actions,/);
}

export function cleanMozillaActions(url = '') {
  let action;
  let href = url;
  if (url.indexOf('moz-action:') === 0) {
    const parts = url.match(/^moz-action:([^,]+),(.*)$/);
    action = parts[1];
    href = parts[2];
    try {
      // handle cases like: moz-action:visiturl,{"url": "..."}
      const mozActionUrl = JSON.parse(href).url;
      if (mozActionUrl) {
        href = decodeURIComponent(mozActionUrl);
      }
    } catch (e) {
      // empty
    }
  }
  return [action, href];
}

export function urlStripProtocol(url, { stripTrailingSlash } = { stripTrailingSlash: true }) {
  let lowerCaseURL = url.toLowerCase();
  let resultUrl = url;
  const toRemove = [
    'https://', 'http://',
    'www2.', 'www.',
    'mobile.', 'mobil.', 'm.'
  ];

  for (let i = 0; i < toRemove.length; i += 1) {
    const part = toRemove[i];
    if (lowerCaseURL.startsWith(part)) {
      resultUrl = resultUrl.substr(part.length);
      lowerCaseURL = lowerCaseURL.substr(part.length);
    }
  }

  // remove trailing slash as well to have all urls in the same format
  if (stripTrailingSlash && resultUrl.endsWith('/')) {
    resultUrl = resultUrl.substr(0, resultUrl.length - 1);
  }

  return resultUrl;
}
