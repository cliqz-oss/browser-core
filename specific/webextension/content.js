window.addEventListener('message', function (ev) {

  let message = {};

  try {
    message = JSON.parse(ev.data);
  } catch (e) {
    // non CLIQZ or invalid message should be ignored
  }

  if (message.target === 'cliqz') {
    chrome.runtime.sendMessage(message, function (response) {
      window.postMessage(JSON.stringify({
        type: "response",
        response: response.response,
        action: response.action,
        module: response.module,
        requestId: response.requestId,
      }), "*");
    });
  }
});
