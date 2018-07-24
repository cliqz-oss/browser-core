/* eslint-disable */

// callback called multiple times
export default function getHistory(q, callback, isPrivate = false) {
  callback({
    query: q,
    results: [],
    ready: true
  });
}
