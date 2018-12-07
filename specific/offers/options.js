function saveOptions(e) {
  e.preventDefault();

  function handleResponse(message) {
    console.log(`Message from the background script:  ${JSON.stringify(message.response)}`);
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }
  const sending = (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [{ prefKey: 'telemetry', prefValue: document.querySelector('#telemetry_enabled').checked }],
    action: 'setPref',
  }, handleResponse);
  if (sending && sending.then) {
    sending.then(handleResponse, handleError);
  }
}

function restoreOptions() {
  function handleResponse(message) {
    document.querySelector('#telemetry_enabled').checked = message.response;
  }

  function handleError(error) {
    console.log(`Error: ${error}`);
  }
  const sending = (chrome || browser).runtime.sendMessage({
    module: 'offers-banner',
    args: [{ prefKey: 'telemetry' }],
    action: 'getPref'
  }, handleResponse);
  if (sending && sending.then) {
    sending.then(handleResponse, handleError);
  }
}

document.addEventListener('DOMContentLoaded', restoreOptions);

document.querySelector('form').addEventListener('submit', saveOptions);
