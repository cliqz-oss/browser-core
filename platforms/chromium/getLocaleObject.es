import { httpHandler } from '../core/http';

export default function (url) {
  // Warning - sync request
  return JSON.parse(httpHandler('GET', url, null, null, null, null, true).response);
}
