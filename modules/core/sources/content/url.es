export function isCliqzAction(url) {
  return url.match(/^cliqz-actions,/);
}

// TODO: @chrmod - bring back something like platform quals
export function equals(url1, url2) {
  if (!url1 || !url2) {
    return false;
  }

  if (url1 === url2) {
    return true;
  }

  try {
    if (decodeURI(url1) === decodeURI(url2)) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
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

export function urlStripProtocol(url) {
  let resultUrl = url.toLowerCase();
  const toRemove = [
    'https://', 'http://',
    'www2.', 'www.',
    'mobile.', 'mobil.', 'm.'
  ];

  for (let i = 0; i < toRemove.length; i += 1) {
    const part = toRemove[i];
    if (resultUrl.startsWith(part)) {
      resultUrl = resultUrl.substr(part.length);
    }
  }

  // remove trailing slash as well to have all urls in the same format
  if (resultUrl[resultUrl.length - 1] === '/') {
    resultUrl = resultUrl.substr(0, resultUrl.length - 1);
  }

  return resultUrl;
}

