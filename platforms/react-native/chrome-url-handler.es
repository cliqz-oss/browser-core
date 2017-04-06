// manually require files we want to bundle with the release
let bundledFiles = {
  'antitracking/prob.json': require('../antitracking/prob.json'),
  'antitracking/tracker_owners.json': require('../antitracking/tracker_owners.json'),
  'antitracking/anti-tracking-report-list.json': require('../antitracking/anti-tracking-report-list.json'),
  'antitracking/cookie_whitelist.json': require('../antitracking/cookie_whitelist.json'),
  'antitracking/anti-tracking-block-rules.json': require('../antitracking/anti-tracking-block-rules.json'),
  'adblocker/mobile/checksums': require('../adblocker/mobile/checksums.json'),
};

export function chromeUrlHandler(url, callback, onerror) {
  const path = url.replace('chrome://cliqz/content/', '');

  if (bundledFiles[path]) {
    callback(bundledFiles[path]);
  } else {
    console.log('chromeUrlHandler: not bundled', path);
    onerror()
  }
}
