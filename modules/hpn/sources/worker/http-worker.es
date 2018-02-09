export default function (url) {
  const core = {
    // Method that performs request
    req(method, uri, data, type) {
      // Creating a promise
      const promise = new Promise((resolve, reject) => {
        // Instantiates the XMLHttpRequest
        const client = new XMLHttpRequest();

        client.open(method, uri, true);
        client.setRequestHeader('x-type', type || 'delayed');
        client.overrideMimeType('application/json');
        // client.setRequestHeader("Content-Type", "application/json;charset=utf-8");

        client.onload = () => {
          const statusClass = parseInt(client.status / 100, 10);
          if (statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */) {
            // Performs the function "resolve" when client.status is equal to 2xx
            resolve(client.response);
          } else {
            // Performs the function "reject" when client.status is different than 2xx
            const errorMessage = client.statusText || `Request failed with status ${client.status}`;
            reject(errorMessage);
          }
        };
        client.onerror = () => {
          reject(client.statusText);
        };
        client.ontimeout = () => {
          reject(client.statusText);
        };

        client.send(data);
      });

      // Return the promise
      return promise;
    }
  };


  return {
    get(args) {
      return core.req('GET', url, args);
    },
    post(args, type) {
      return core.req('POST', url, args, type);
    }
  };
}
