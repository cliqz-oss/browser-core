import * as browser from '../core/browser';
import * as gzip from '../core/gzip';
import history from '../core/history-manager';
import webrequest from '../core/webrequest';
import * as i18n from '../core/i18n';
import * as http from '../core/http';
import * as searchEngines from '../core/search-engines';
import testServer from '../tests/core/http-server';

export default function (window) {
  Object.assign(window.CLIQZ, {
    TestHelpers: {
      testServer,
      browser,
      gzip,
      history,
      http,
      i18n,
      searchEngines,
      webrequest,
    },
  });
}
