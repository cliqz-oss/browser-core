import * as browser from '../core/browser';
import * as gzip from '../core/gzip';
import history from '../core/history-manager';
import webrequest from '../core/webrequest';
import * as i18n from '../core/i18n';
import { pingCliqzResults } from '../ui/urlbar-events';
import * as http from '../core/http';
import * as searchEngines from '../core/search-engines';

export default function (window) {
  Object.assign(window.CLIQZ, {
    TestHelpers: {
      browser,
      gzip,
      history,
      webrequest,
      i18n,
      pingCliqzResults,
      http,
      searchEngines,
    },
  });
}
