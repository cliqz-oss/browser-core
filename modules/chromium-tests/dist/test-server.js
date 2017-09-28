
function reset() {
  return fetch('http://127.0.0.1:3000/reset', {
    method: 'get'
  });
}


function getHits() {
  return fetch('http://127.0.0.1:3000/info', {
    method: 'get'
  })
  .then(response => response.text())
  .then((data) => {
    console.log('Request succeeded with JSON response', data);
    return JSON.parse(data);
  })
  .catch((error) => {
    console.error('Request failed', error);
  });
}


function mockPath(path, result, headers, status) {
  const body = JSON.stringify({ path, result, headers, status });
  return fetch('http://127.0.0.1:3000/mock', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body,
  })
  .then(resp => resp.json())
  .then((data) => {
    console.log(`Request succeeded with JSON response ${JSON.stringify(data)}`);
  })
  .catch((error) => {
    console.log(`Request failed to mock ${path} ${error}`);
  });
}


function mockDirectories(path, directories) {
  return fetch('http://127.0.0.1:3000/mock', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ path, directories })
  })
  .then(resp => resp.json())
  .then((data) => {
    console.log(`Request succeeded with JSON response ${JSON.stringify(data)}`);
  })
  .catch((error) => {
    console.log(`Request failed to mock ${path} ${error}`);
  });
}


const testServer = {
  port: 3000,
  url: 'http://localhost',
  getBaseUrl(path) { return `${this.url}:${this.port}/${path || ''}`; },
  getHitCtr(path = '/') {
    return getHits().then(hits => (hits[path] || []).length);
  },
  getHits() {
    return getHits();
  },
  hasHit(endpoint) {
    return getHits().then(hits => hits[endpoint] !== undefined);
  },
  reset() {
    return reset();
  },
  registerPathHandler(path, result, headers, status) {
    // Make request to localhost:3000/mock
    return mockPath(path, result, headers, status);
  },
  registerDirectory(path, directories) {
    return mockDirectories(path, directories);
  },
  writeFileResponse(req, file, response) { },
};
