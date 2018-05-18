import console from './console';

/* eslint-disable import/prefer-default-export, import/no-dynamic-require, global-require */
export function chromeUrlHandler(url, callback, onerror) {
  const path = url.replace('chrome://', '');
  try {
    const response = JSON.stringify(require(`../${path}`));
    callback({
      status: 200,
      response,
    });
  } catch (e) {
    console.log('chromeUrlHandler: not bundled', path, e);
    onerror();
  }
}
/* eslint-enable import/prefer-default-export, import/no-dynamic-require, global-require */
