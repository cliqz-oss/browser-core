/*
strip protocol from url
*/
export function urlStripProtocol(url) {
  let resultUrl = url;
  const toRemove = ['https://', 'http://',
    'www2.', 'www.',
    'mobile.', 'mobil.', 'm.'];
  toRemove.forEach(part => {
    if (resultUrl.toLowerCase().startsWith(part)) {
      resultUrl = resultUrl.substring(part.length);
    }
  });
  // remove trailing slash as well to have all urls in the same format
  if (resultUrl[resultUrl.length - 1] === '/') {
    resultUrl = resultUrl.slice(0, -1);
  }
  return resultUrl;
}
