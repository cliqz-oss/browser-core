import checkIfChromeReady from '../core/content/ready-promise';
import siteBuilder from './dashboard/app';
import createSpananForModule from '../core/helpers/spanan-module-wrapper';

const privacyBridge = createSpananForModule('privacy');
const privacy = privacyBridge.createProxy();

// main entry point
checkIfChromeReady().then(() => {
  chrome.runtime.onMessage.addListener((message) => {
    privacyBridge.handleMessage({
      uuid: message.requestId,
      response: message.response
    });
  });
  siteBuilder(privacy);
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
