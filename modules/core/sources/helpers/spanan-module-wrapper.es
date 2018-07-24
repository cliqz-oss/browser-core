import Spanan from 'spanan';
import { CHROME_MSG_SOURCE } from '../content/helpers';

export default function createSpananForModule(moduleName) {
  const spanan = new Spanan(({ uuid, action, args }) => {
    const message = {
      source: CHROME_MSG_SOURCE,
      target: 'cliqz',
      module: moduleName,
      action,
      requestId: uuid,
      args
    };

    chrome.runtime.sendMessage(message, (response) => {
      if (!response) {
        return;
      }
      spanan.handleMessage({
        uuid,
        response: response.response
      });
    });
  });

  return spanan;
}
