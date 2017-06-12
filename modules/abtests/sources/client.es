import { fetch, Request, Headers } from '../core/http';

const ABTESTS_BACKEND_URL = 'https://abtests.cliqz.com/abtests';

export default class {
  fetchJson(url, method, payload) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    const request = new Request(url, {
      headers,
      method,
      body: JSON.stringify(payload) });
    return fetch(request)
      .then((response) => {
        if (!response.ok) {
          return Promise.reject(`Backend ${url} answered with code ${response.status}`);
        }
        return response.json();
      });
  }

  get(url, payload) {
    return this.fetchJson(url, 'GET', payload);
  }

  post(url, payload) {
    return this.fetchJson(url, 'POST', payload);
  }

  getAvailableTests() {
    return this.get(`${ABTESTS_BACKEND_URL}/get`);
  }

  enterTest(id, group) {
    return this.post(`${ABTESTS_BACKEND_URL}/enter`, { test_id: id, group })
      .then(data => data.success);
  }

  leaveTest(id, group) {
    return this.post(`${ABTESTS_BACKEND_URL}/leave`, { test_id: id, group })
      .then(data => data.success);
  }
}
