import checkIfChromeReady from '../../core/content/ready-promise';
import createSpananForModule from '../../core/helpers/spanan-module-wrapper';
import siteBuilder from './app';

const anolysisBridge = createSpananForModule('anolysis');
const anolysis = anolysisBridge.createProxy();


checkIfChromeReady().then(() => {
  chrome.runtime.onMessage.addListener((message) => {
    anolysisBridge.handleMessage({
      uuid: message.requestId,
      response: message.response
    });
  });
  siteBuilder(anolysis);
}).catch((ex) => {
  // eslint-disable-next-line no-console
  console.error('Chrome was never ready', ex);
});
