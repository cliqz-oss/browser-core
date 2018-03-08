// fetching local files is intentionally not supported by the fetch library
// https://github.com/github/fetch/pull/92#issuecomment-140665932
function fetchLocal(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest
    xhr.onload = function() {
      resolve(new Response(xhr.responseText, {status: xhr.status}))
    }
    xhr.onerror = function() {
      reject(new TypeError('Local request failed'))
    }
    xhr.open('GET', url)
    xhr.send(null)
  })
}

export function fetchFactory() {
  return fetch;
}

export default fetch;
export {
  fetch,
  Headers,
  Request,
  Response,
  fetchLocal,
}
