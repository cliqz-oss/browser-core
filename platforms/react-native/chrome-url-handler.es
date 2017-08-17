// manually require files we want to bundle with the release
let bundledFiles = {
  'antitracking/prob.json': require('../antitracking/prob.json'),
  'antitracking/tracker_owners.json': require('../antitracking/tracker_owners.json'),
  'antitracking/config.json': require('../antitracking/config.json'),
  'adblocker/mobile/checksums': require('../adblocker/mobile/checksums.json'),
  'antitracking-blocker/bugs_default.json': require('../antitracking-blocker/bugs_default.json'),
};

export function chromeUrlHandler(url, callback, onerror) {
  const path = url.replace('chrome://cliqz/content/', '');
  if (bundledFiles[path]) {
    callback({
      status: 200,
      response: JSON.stringify(bundledFiles[path]),
    });
  } else {
    console.log('chromeUrlHandler: not bundled', path);
    onerror()
  }
}
