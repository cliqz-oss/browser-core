import checkIfChromeReady from '../../core/content/ready-promise';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';
import siteBuilder from './app';

const adblockerBridge = createSpananForModule('adblocker');
const adblocker = adblockerBridge.createProxy();

checkIfChromeReady().then(() => {
  chrome.runtime.onMessage.addListener((message) => {
    adblockerBridge.handleMessage({
      uuid: message.requestId,
      response: message.response
    });
  });
  siteBuilder(adblocker);
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
