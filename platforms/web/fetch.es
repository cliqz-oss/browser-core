// fetching local files is intentionally not supported by the fetch library
// https://github.com/github/fetch/pull/92#issuecomment-140665932
function fetchLocal(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      resolve(new Response(xhr.responseText, { status: xhr.status }));
    };
    xhr.onerror = () => {
      reject(new TypeError('Local request failed'));
    };
    xhr.open('GET', url);
    xhr.send(null);
  });
}

function _fetch(url, options, { jsonp } = {}) {
  if (jsonp !== true) {
    return fetch(url, options);
  }

  const promise = new Promise((fulfilled, rejected) => {
    const jsonpCallback = `c${new Date().getTime()}`;

    window[jsonpCallback] = (response) => {
      const res = {
        json: () => response
      };
      fulfilled(res);
    };
    const script = document.createElement('script');
    script.src = `${url}&callback=${jsonpCallback}`;

    script.onload = () => {
      script.onload = null;
      document.body.removeChild(script);
      window[jsonpCallback] = null;
    };
    script.onerror = (error) => {
      script.onerror = null;
      document.body.removeChild(script);
      window[jsonpCallback] = null;

      rejected(error);
    };
    document.body.appendChild(script);
  });

  return promise;
}

const isTrackableOriginHeaderFromOurExtension = () => false;

export default _fetch;

const _Headers = Headers;
const _Request = Request;
const _Response = Response;

export {
  _fetch as fetch,
  _Headers as Headers,
  _Request as Request,
  _Response as Response,
  fetchLocal,
  isTrackableOriginHeaderFromOurExtension
};
export const fetchArrayBuffer = _fetch;
