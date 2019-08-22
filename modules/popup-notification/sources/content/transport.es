/* eslint-disable import/prefer-default-export */

const pop = (CLIQZ, data) => CLIQZ.app.modules['popup-notification'].action('pop', data);
const log = (CLIQZ, data) => CLIQZ.app.modules['popup-notification'].action('log', data);
const openAndClosePinnedURL = (CLIQZ, data) =>
  CLIQZ.app.modules['popup-notification'].action('openAndClosePinnedURL', data);
export { pop, log, openAndClosePinnedURL };
