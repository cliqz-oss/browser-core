import Spanan from 'spanan';
import { chrome } from '../../platform/content/globals';

export default function createSpananForModule(moduleName) {
  const spanan = new Spanan(({ uuid, action, args }) => {
    const message = {
      module: moduleName,
      action,
      requestId: uuid,
      args
    };
    const onResponse = (response) => {
      if (!response) {
        return;
      }
      spanan.handleMessage({
        uuid,
        response: response.response
      });
    };

    const promise = chrome.runtime.sendMessage(message, onResponse);

    if (promise && promise.then) {
      promise.then(onResponse);
    }
  });

  chrome.runtime.onMessage.addListener(
    ({ requestId, response }) => spanan.handleMessage({
      uuid: requestId,
      response,
    })
  );

  return spanan;
}
