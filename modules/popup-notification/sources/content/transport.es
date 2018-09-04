/* eslint-disable import/prefer-default-export */

const pop = (CLIQZ, data) => CLIQZ.app.modules['popup-notification'].action('pop', data);
const log = (CLIQZ, data) => CLIQZ.app.modules['popup-notification'].action('log', data);
export { pop, log };
