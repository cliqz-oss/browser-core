import XMLHttpRequest from 'xhr2';

function setPrivateFlags() {}
function setBackgroundRequest() {}
function XMLHttpRequestFactory() {
  return XMLHttpRequest;
}

export {
  XMLHttpRequestFactory,
  setPrivateFlags,
  setBackgroundRequest
}
