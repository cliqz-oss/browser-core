function lstrip(str, chars) {
  return str.replace(new RegExp(`^[${chars}]+`), '');
}

function rstrip(str, chars) {
  return str.replace(new RegExp(`[${chars}]+$`), '');
}

function strip(str, chars) {
  return lstrip(rstrip(str, chars), chars);
}

function reset() {
  return fetch('http://127.0.0.1:3000/reset', {
    method: 'get'
  });
}


async function getHits() {
  const hits = new Map();

  try {
    const response = await fetch('http://127.0.0.1:3000/info', {
      method: 'get'
    });
    const data = await response.text();
    console.log('Request succeeded with JSON response', data);
    const parsed = JSON.parse(data);
    Object.keys(parsed).forEach((key) => {
      hits.set(key, parsed[key]);
    });
  } catch (error) {
    console.error('Request failed', error);
  }

  return hits;
}


async function mockPath(path, result, headers, status) {
  const body = JSON.stringify({ path, result, headers, status });
  try {
    const response = await fetch('http://127.0.0.1:3000/mock', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body,
    });
    await response.json();
  } catch (error) {
    console.log(`Request failed to mock ${path} ${error}`);
  }
}


async function mockDirectories(path, directories) {
  try {
    const response = await fetch('http://127.0.0.1:3000/mock', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({ path, directories })
    });
    await response.json();
  } catch (error) {
    console.log(`Request failed to mock ${path} ${error}`);
  }
}


let pacRegistered = false;

export default {
  port: 3000,
  url: 'http://localhost',
  getBaseUrl(path = '/') {
    return strip(`${this.url}:${this.port}/${strip(path, '/')}`, '/');
  },
  async getHitCtr(path = '/') {
    return getHits().then(hits => (hits.get(path) || []).length);
  },
  async getHits() {
    return getHits();
  },
  async hasHit(endpoint) {
    const hits = (await getHits()).get(endpoint);
    if (!hits || hits.length === 0) {
      return false;
    }
    return true;
  },
  async reset() {
    return reset();
  },
  async registerPathHandler(path, result, headers = [], status = '200') {
    return mockPath(path, result, headers, status);
  },
  async registerDirectory(path, directories) {
    return mockDirectories(path, directories);
  },
  writeFileResponse(/* req, file, response */) {
    // TODO - Not implemented yet.
  },
};
