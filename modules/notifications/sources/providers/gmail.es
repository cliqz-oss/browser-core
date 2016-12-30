import { txtToDom } from '../../core/dom-parser';

function get(url, headers, data, timeout) {
  return new Promise(function(resolve, reject) {
    headers = headers || {};

    let req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
      .createInstance(Ci.nsIXMLHttpRequest);
    req.mozBackgroundRequest = true;  //No authentication
    req.timeout = timeout;
    req.open('GET', url, true);
    for(let id in headers) {
      req.setRequestHeader(id, headers[id]);
    }

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        resolve(req);
      }
    };

    req.channel
      .QueryInterface(Ci.nsIHttpChannelInternal)
      .forceAllowThirdPartyCookie = true;
    if(data) {
      let arr = [];
      for (let e in data) {
        arr.push(e + '=' + data[e]);
      }
      data = arr.join('&');
    }
    req.send(data ? data : '');
    return req;
  });
}

export default class {
  constructor() {
    this.url = 'https://mail.google.com/mail/u/0/feed/atom' + '?rand=' + Math.round(Math.random() * 10000000);
  }

  count() {
    return get(this.url).then(response => this.getNotificationCount(response.response));
  }

  getNotificationCount(txt) {
    var feed = txtToDom(txt);
    var fullCount = 0;
    var arr = feed.getElementsByTagName("fullcount");
    if(arr && arr.length) {
      var tmp = arr[0].textContent;
      if(tmp) fullCount = parseInt(tmp) || 0;
    }
    return fullCount;
  }
}
