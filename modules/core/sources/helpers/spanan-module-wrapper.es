import Spanan from 'spanan';

export default function createSpananForModule(moduleName) {
  const spanan = new Spanan(({ uuid, action, args }) => {
    const message = {
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

  chrome.runtime.onMessage.addListener(
    ({ requestId, response }) => spanan.handleMessage({
      uuid: requestId,
      response,
    })
  );

  return spanan;
}
