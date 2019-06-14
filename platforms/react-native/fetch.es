export default fetch;

const isTrackableOriginHeaderFromOurExtension = () => false;

function fetchArrayBuffer(url) {
  return new Promise((resolve) => {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';

    req.onload = () => {
      const resp = req.response;
      if (resp) {
        resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(resp),
          json: () => Promise.resolve(JSON.parse(resp))
        });
      } else {
        resolve({
          ok: false,
        });
      }
    };

    req.onError = () => {
      const resp = req.response;
      resolve({
        ok: false,
        resp
      });
    };

    req.send(null);
  });
}

const $fetch = fetch;
const $Headers = Headers;
const $Request = Request;
const $Response = Response;

export {
  $fetch as fetch,
  $Headers as Headers,
  $Request as Request,
  $Response as Response,
  isTrackableOriginHeaderFromOurExtension,
  fetchArrayBuffer
};
