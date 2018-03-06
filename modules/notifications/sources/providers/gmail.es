/* eslint no-param-reassign: 'off' */
/* eslint no-restricted-syntax: 'off' */

import utils from '../core/utils';
import txtToDom from '../../core/dom-parser';

function get(url, headers, data, timeout) {
  return new Promise((resolve, reject) => {
    headers = headers || {};

    const req = new XMLHttpRequest();
    req.mozBackgroundRequest = true; // No authentication
    req.timeout = timeout;
    req.open('GET', url, true);
    for (const id in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, id)) {
        req.setRequestHeader(id, headers[id]);
      }
    }

    req.onload = () => {
      if (req.status === 200) {
        resolve(req);
      } else {
        reject('cannot-fetch-count');
      }
    };

    req.onerror = () => {
      reject('cannot-fetch-count');
    };

    req.channel
      .QueryInterface(Ci.nsIHttpChannelInternal)
      .forceAllowThirdPartyCookie = true;
    if (data) {
      const arr = [];
      for (const e in data) {
        if (Object.prototype.hasOwnProperty.call(data, e)) {
          arr.push(`${e}=${data[e]}`);
        }
      }
      data = arr.join('&');
    }
    req.send(data || '');
    return req;
  });
}

export default class Gmail {
  constructor() {
    this.url = `https://mail.google.com/mail/u/0/feed/atom?rand=${Math.round(Math.random() * 10000000)}`;
  }

  count() {
    return get(this.url).then(response => this.getNotificationCount(response.response));
  }

  getNotificationCount(txt) {
    const feed = txtToDom(txt);
    let fullCount = 0;
    const arr = feed.getElementsByTagName('fullcount');
    if (arr && arr.length) {
      const text = arr[0].textContent;
      if (text) {
        fullCount = parseInt(text, 10);
      }
    }
    utils.log(fullCount, 'getNotificationCount');
    if (fullCount >= 0) {
      return fullCount;
    }
    throw new Error('cannot-get-count');
  }
}
