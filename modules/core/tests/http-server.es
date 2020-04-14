/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
  try {
    const response = await fetch('http://127.0.0.1:3000/info', {
      method: 'get'
    });
    const data = await response.text();
    return new Map(Object.entries(JSON.parse(data)));
  } catch (error) {
    throw new Error(`Could not get hits from test server: ${error}`);
  }
}


async function getLastHits() {
  const hits = await getHits();
  const lastHits = new Map();

  hits.forEach((value, key) => {
    lastHits.set(key, value.pop());
  });

  return lastHits;
}


async function mock(mockInfo) {
  const response = await fetch('http://127.0.0.1:3000/mock', {
    method: 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(mockInfo),
  });
  return response.json();
}


async function mockPath(mockInfo) {
  try {
    await mock(mockInfo);
  } catch (error) {
    throw new Error(`Could not register mock in test server: ${JSON.stringify(mockInfo)} ${error}`);
  }
}


async function mockDirectories(path, directories) {
  try {
    await mock({ path, directories });
  } catch (error) {
    throw new Error(`Could not register directories mock in test server: ${path} ${directories} ${error}`);
  }
}


class TestServer {
  constructor() {
    this.port = 3000;
    this.baseDomain = 'localhost';
    this.url = `http://${this.baseDomain}`;
    this.needsReset = false;
  }

  registerPathHandler(path, { result = '{}', headers = [], status = '200', timeout = 0 } = {}) {
    this.needsReset = true;
    return mockPath({ path, result, headers, status, timeout });
  }

  registerDirectory(path, directories) {
    this.needsReset = true;
    return mockDirectories(path, directories);
  }

  reset() {
    if (this.needsReset === true) {
      this.needsReset = false;
      return reset();
    }
    return Promise.resolve();
  }

  getBaseUrl(path = '/', hostname = 'localhost') {
    return strip(`http://${hostname}:${this.port}/${strip(path, '/')}`, '/');
  }

  getHits() {
    return getHits();
  }

  getLastHits() {
    return getLastHits();
  }

  async getHitsForPath(path) {
    return (await this.getHits()).get(path) || [];
  }

  async getHitCtr(path) {
    return (await this.getHitsForPath(path)).length;
  }

  async getAllRequests() {
    const requests = [];
    (await this.getHits()).forEach((reqs) => {
      requests.push(...reqs);
    });
    return requests;
  }

  async numberOfRequestsReceived() {
    return (await this.getAllRequests()).length;
  }

  async hasHit(path) {
    return (await this.getHitCtr(path)) > 0;
  }

  fetch(...args) {
    return fetch(this.getBaseUrl(...args));
  }
}

export default new TestServer();
