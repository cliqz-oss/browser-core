// manually require files we want to bundle with the release
let bundledFiles = {
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
