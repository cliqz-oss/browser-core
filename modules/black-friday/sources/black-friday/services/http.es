export default class Http {
  get(url) {
    return fetch(url).then(data => data.json());
  }

  put(url, data) {
    return fetch(url, {
      method: 'PUT',
      data
    }).then(data1 => data1.json());
  }
}
