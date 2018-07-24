export default function (url) {
  return {
    post(data, type = 'delayed') {
      return fetch(url, {
        method: 'POST',
        body: data,
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'x-type': type,
          'Content-Type': 'application/json;charset=utf-8',
        },
        referrerPolicy: 'no-referrer',
      }).then(response => response.text());
    }
  };
}
