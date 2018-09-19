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

export function fetchFactory({ jsonp }) {
  if (jsonp !== true) {
    return fetch;
  }

  return (apiUrl) => {
    const promise = new Promise((fulfilled, rejected) => {
      const jsonpCallback = `c${new Date().getTime()}`;

      window[jsonpCallback] = (response) => {
        const res = {
          json: () => response
        };
        fulfilled(res);
      };
      const script = document.createElement('script');
      script.src = `${apiUrl}&callback=${jsonpCallback}`;

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
  };
}

export default fetch;
export {
  fetch,
  Headers,
  Request,
  Response,
  fetchLocal
};
