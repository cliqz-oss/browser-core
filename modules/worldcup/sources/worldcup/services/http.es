export default class Http {
  get(url) {
    return fetch(url).then(data => data.json());
  }

  put(url, data) {
    return fetch(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }).then(response => response.json());
  }
}
