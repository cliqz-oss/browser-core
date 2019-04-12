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

export {
  fetch,
  Headers,
  Request,
  Response,
  isTrackableOriginHeaderFromOurExtension,
  fetchArrayBuffer
};
