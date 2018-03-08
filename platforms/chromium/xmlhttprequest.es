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
