import * as browser from '../core/browser';
import * as gzip from '../core/gzip';
import history from '../core/history-manager';
import webrequest from '../core/webrequest';

export default function (window) {
  Object.assign(window.CLIQZ, {
    TestHelpers: {
      browser,
      gzip,
      history,
      webrequest
    },
  });
}
