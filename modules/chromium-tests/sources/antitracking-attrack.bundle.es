/* eslint no-unused-expressions: 'off' */
/* eslint func-names: 'off' */
/* eslint prefer-arrow-callback: 'off' */
/* eslint no-param-reassign: 'off' */
/* eslint no-console: 'off' */
/* global chai */

import { utils } from '../core/cliqz';
import Attrack from '../antitracking/attrack';
import QSWhitelist from '../antitracking/qs-whitelists';
import md5 from '../core/helpers/md5';
import coreBG from '../core/background';
import Config from '../antitracking/config';
import { updateDefaultTrackerTxtRule } from '../antitracking/tracker-txt';

// Mock webrequest listener
import { setGlobal } from '../core/kord/inject';
import WebRequestPipeline from '../webrequest-pipeline/background';

const THIRD_PARTY_HOST1 = '127.0.0.1:60508';
const THIRD_PARTY_HOST2 = 'cliqztest.de:60508';

const testPages = {};
testPages.thirdpartyscript = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/thirdpartyscript.html',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 6,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 2,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 11,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/thirdpartyscript.html',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 6,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 2,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 11,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/thirdpartyscript.html',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 6,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 2,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 66,
      parentFrameId: 66,
      tabId: 66,
      type: 11,
      originUrl: 'http://localhost:60508/thirdpartyscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/thirdpartyscript.html'
    }
  ]
};
testPages.injectedscript = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/injectedscript.html',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 6,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 11,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 2,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/injectedscript.html',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 6,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 11,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 2,
      originUrl: 'http://localhost:60508/injectedscript.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/injectedscript.html',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 6,
      originUrl: 'http://localhost:60508/injectedscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 11,
      originUrl: 'http://localhost:60508/injectedscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 69,
      parentFrameId: 69,
      tabId: 69,
      type: 2,
      originUrl: 'http://localhost:60508/injectedscript.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/injectedscript.html'
    }
  ]
};
testPages.imgtest = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/imgtest.html',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 6,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/imgtest.html',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 6,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/imgtest.html',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 6,
      originUrl: 'http://localhost:60508/imgtest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 72,
      parentFrameId: 72,
      tabId: 72,
      type: 3,
      originUrl: 'http://localhost:60508/imgtest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/imgtest.html'
    }
  ]
};
testPages.crossdomainxhr = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/crossdomainxhr.html',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 6,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 2,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/crossdomainxhr.html',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 6,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 2,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/crossdomainxhr.html',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 6,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 2,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 75,
      parentFrameId: 75,
      tabId: 75,
      type: 11,
      originUrl: 'http://localhost:60508/crossdomainxhr.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/crossdomainxhr.html'
    }
  ]
};
testPages.iframetest = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/iframetest.html',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 6,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe.html',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 7,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/iframetest.html',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 6,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe.html',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 7,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://localhost:60508/iframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/iframetest.html',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 6,
      originUrl: 'http://localhost:60508/iframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://localhost:60508/iframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe.html',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 7,
      originUrl: 'http://localhost:60508/iframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 78,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://localhost:60508/iframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 81,
      parentFrameId: 78,
      tabId: 78,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/iframetest.html'
    }
  ]
};
testPages.image302test = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/image302test.html',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 6,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/image302test.html',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 6,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/image302test.html',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 6,
      originUrl: 'http://localhost:60508/image302test.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      statusCode: 302,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 84,
      parentFrameId: 84,
      tabId: 84,
      type: 3,
      originUrl: 'http://localhost:60508/image302test.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/image302test.html'
    }
  ]
};
testPages.nestediframetest = {
  onBeforeRequest: [
    {
      url: 'http://localhost:60508/nestediframetest.html',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 6,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/proxyiframe.html',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 7,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 11,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe2.html',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 7,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    }
  ],
  onBeforeSendHeaders: [
    {
      url: 'http://localhost:60508/nestediframetest.html',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 6,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/proxyiframe.html',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 7,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 11,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe2.html',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 7,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    }
  ],
  onHeadersReceived: [
    {
      url: 'http://localhost:60508/nestediframetest.html',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 6,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://localhost:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/proxyiframe.html',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 7,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://cliqztest.de:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 90,
      parentFrameId: 87,
      tabId: 87,
      type: 2,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 87,
      parentFrameId: 87,
      tabId: 87,
      type: 11,
      originUrl: 'http://localhost:60508/nestediframetest.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/iframe2.html',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 7,
      originUrl: 'http://cliqztest.de:60508/proxyiframe.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url: 'http://127.0.0.1:60508/node_modules/jquery/dist/jquery.js',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 2,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: true,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    },
    {
      url:
        'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
      method: 'GET',
      frameId: 93,
      parentFrameId: 90,
      tabId: 87,
      type: 11,
      originUrl: 'http://127.0.0.1:60508/iframe2.html',
      statusCode: 200,
      isPrivate: false,
      fromCache: false,
      sourceUrl: 'http://localhost:60508/nestediframetest.html'
    }
  ]
};

// test helpers and mocks

function mockRequestHeaders() {
  return [
    { name: 'Cookie', value: 'uid=234239gjvbadsfdsaf' },
    { name: 'Referer', value: '' },
  ];
}

function mockResponseHeaders() {
  return [
    { name: 'Content-Length', value: '0' },
  ];
}

function isThirdParty(url) {
  return url.indexOf(THIRD_PARTY_HOST1) > -1 || url.indexOf(THIRD_PARTY_HOST2) > -1;
}

function expectNoModification(resp) {
  if (resp.response) {
    chai.expect(resp.response).not.have.property('cancel');
    chai.expect(resp.response).not.have.property('redirectUrl');
    chai.expect(resp.response).not.have.property('requestHeaders');
  } else {
    chai.expect(resp.response).to.be.undefined;
  }
}

let attrack;

before(() => coreBG.init());

describe('Test Attrack listeners', function () {
  let initialCookie = true;

  beforeEach(function () {
    // Try to mock app
    WebRequestPipeline.unload();
    return WebRequestPipeline.init({})
      .then(() => setGlobal({
        modules: {
          'webrequest-pipeline': {
            isEnabled: true,
            isReady() { return Promise.resolve(true); },
            background: {
              actions: {
                addPipelineStep: WebRequestPipeline.actions.addPipelineStep,
                removePipelineStep: WebRequestPipeline.actions.removePipelineStep,
              }
            }
          }
        }
      }))
      .then(() => { attrack = new Attrack(); })
      .then(() => attrack.init(new Config({})))
      .then(() => {
        // clean, mocked QSWhitelist
        attrack.qs_whitelist = new QSWhitelist();
        attrack.qs_whitelist.isUpToDate = function () { return true; };
        attrack.qs_whitelist.isReady = function () { return true; };

        initialCookie = utils.getPref('attrackBlockCookieTracking');

        attrack.config.cookieEnabled = false;
        attrack.config.qsEnabled = false;
        attrack.config.shortTokenLength = 6;

        attrack.recentlyModified.clear();
      });
  });

  afterEach(function () {
    return attrack.tp_events.commit(true)
      .then(() => {
        utils.setPref('attrackBlockCookieTracking', initialCookie);
        utils.setPref('attrackRemoveQueryStringTracking', initialCookie);
      })
      .then(() => attrack.unload())
      .then(() => WebRequestPipeline.unload());
  });

  function simulatePageLoad(pageSpec) {
    return {
      onBeforeRequest: pageSpec.onBeforeRequest.map(function (reqData) {
        reqData.requestHeaders = mockRequestHeaders();
        const response = WebRequestPipeline.onBeforeRequest(reqData);
        return { url: reqData.url, response };
      }),
      onBeforeSendHeaders: pageSpec.onBeforeSendHeaders.map(function (reqData) {
        reqData.requestHeaders = mockRequestHeaders();
        const response = WebRequestPipeline.onBeforeSendHeaders(reqData);
        return { url: reqData.url, response };
      }),
      onHeadersReceived: pageSpec.onHeadersReceived.map(function (reqData) {
        reqData.requestHeaders = mockRequestHeaders();
        reqData.responseHeaders = mockResponseHeaders();
        const response = WebRequestPipeline.onHeadersReceived(reqData);
        return { url: reqData.url, response };
      }),
    };
  }

  Object.keys(testPages).forEach(function (testPage) {
    const reqs = testPages[testPage];

    describe(testPage, function () {
      describe('cookie blocking', function () {
        describe('cookie blocking disabled', function () {
          beforeEach(function () {
            attrack.config.cookieEnabled = false;
          });

          it('allows all cookies', function () {
            const responses = simulatePageLoad(reqs);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeSendHeaders.forEach(expectNoModification);
          });
        });

        describe('cookie blocking enabled', function () {
          beforeEach(function () {
            attrack.config.cookieEnabled = true;
          });

          it('blocks third party cookies', function () {
            const responses = simulatePageLoad(reqs);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeSendHeaders.forEach(function (resp) {
              if (isThirdParty(resp.url)) {
                chai.expect(resp.response).to.not.be.undefined;
                chai.expect(resp.response).to.have.property('requestHeaders');
              } else {
                expectNoModification(resp);
              }
            });
          });

          context('anti-tracking disabled for source domain', function () {
            beforeEach(function () {
              attrack.urlWhitelist.changeState('localhost', 'hostname', 'add');
            });

            afterEach(function () {
              attrack.urlWhitelist.changeState('localhost', 'hostname', 'remove');
            });

            it('allows all cookies on whitelisted site', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });
          });

          context('anti-tracking disabled for other domain', function () {
            beforeEach(function () {
              attrack.urlWhitelist.changeState('cliqztest.de', 'hostname', 'add');
            });

            afterEach(function () {
              attrack.urlWhitelist.changeState('cliqztest.de', 'hostname', 'remove');
            });

            it('still blocks cookies on other domains', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(function (resp) {
                if (isThirdParty(resp.url)) {
                  chai.expect(resp.response).to.not.be.undefined;
                  chai.expect(resp.response).to.have.property('requestHeaders');
                } else {
                  expectNoModification(resp);
                }
              });
            });
          });
        });
      });

      context('QS blocking', function () {
        beforeEach(function () {
          attrack.config.qsEnabled = true;
        });

        it('allows query strings on domains not in the tracker list', function () {
          const responses = simulatePageLoad(reqs);
          responses.onBeforeRequest.forEach(expectNoModification);
          responses.onBeforeRequest.forEach(expectNoModification);
          responses.onBeforeSendHeaders.forEach(expectNoModification);
        });

        describe('when third party on tracker list', function () {
          const key = md5('uid');
          const trackerHash = md5('127.0.0.1').substring(0, 16);

          beforeEach(function () {
            attrack.qs_whitelist.addSafeToken(trackerHash, '');
            attrack.config.tokenDomainCountThreshold = 2;
            attrack.initPipeline();
            attrack.pipelineSteps.tokenChecker.tokenDomain.clear();
          });

          it('allows QS first time on tracker', function () {
            const responses = simulatePageLoad(reqs);
            responses.onBeforeRequest.forEach(expectNoModification);
            responses.onBeforeSendHeaders.forEach(expectNoModification);
          });

          context('when domain count exceeded', function () {
            const uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

            function expectThirdPartyBlock(req) {
              if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                // request was already redirected
              } else {
                console.log(req);
                expectNoModification(req);
              }
            }

            beforeEach(function () {
              attrack.config.tokenDomainCountThreshold = 0;
            });

            it('blocks long tokens on tracker domain', function () {
              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectThirdPartyBlock);
              responses.onBeforeSendHeaders.forEach(function (req) {
                if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                  // request was already redirected
                } else {
                  expectNoModification(req);
                }
              });
            });

            it('does not block if safekey', function () {
              attrack.qs_whitelist.addSafeKey(trackerHash, key);

              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });

            it('blocks if key listed as unsafe', function () {
              attrack.qs_whitelist.addSafeKey(trackerHash, key);
              attrack.qs_whitelist.addUnsafeKey(trackerHash, key);

              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectThirdPartyBlock);
              responses.onBeforeSendHeaders.forEach(function (req) {
                if (isThirdParty(req.url) && req.url.indexOf(uid) > -1) {
                  // request was already redirected
                } else {
                  expectNoModification(req);
                }
              });
            });

            it('does not block if whitelisted token', function () {
              const tok = md5(uid);
              attrack.qs_whitelist.addSafeToken(trackerHash, tok);

              const responses = simulatePageLoad(reqs);
              responses.onBeforeRequest.forEach(expectNoModification);
              responses.onBeforeSendHeaders.forEach(expectNoModification);
            });

            context('anti-tracking disabled for source domain', function () {
              beforeEach(function () {
                attrack.urlWhitelist.changeState('localhost', 'hostname', 'add');
              });

              afterEach(function () {
                attrack.urlWhitelist.changeState('localhost', 'hostname', 'remove');
              });

              it('allows all tokens on whitelisted site', function () {
                const responses = simulatePageLoad(reqs);
                responses.onBeforeRequest.forEach(expectNoModification);
                responses.onBeforeSendHeaders.forEach(expectNoModification);
              });
            });
          });
        });
      });
    });
  });

  describe('onBeforeRequest', function () {
    const uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

    beforeEach(function () {
      attrack.config.qsEnabled = true;
      attrack.qs_whitelist.addSafeToken(md5('tracker.com').substring(0, 16), '');
      attrack.config.tokenDomainCountThreshold = 0; // block first time
      utils.setPref('attrackDefaultAction', 'placeholder');
      updateDefaultTrackerTxtRule();
      WebRequestPipeline.unload();
      return WebRequestPipeline.init()
        .then(() => attrack.initPipeline());
    });

    it('removes all occurances of uid in the request', function () {
      const mainDoc = WebRequestPipeline.onBeforeRequest({
        tabId: 34,
        frameId: 34,
        parentFrameId: 34,
        method: 'GET',
        type: 6,
        url: 'http://cliqztest.com/',
        requestHeaders: mockRequestHeaders(),
        originUrl: '',
        sourceUrl: '',
      });
      chai.expect(mainDoc).to.not.have.property('cancel');
      chai.expect(mainDoc).to.not.have.property('redirectUrl');
      chai.expect(mainDoc).to.not.have.property('requestHeaders');
      const response = WebRequestPipeline.onBeforeRequest({
        tabId: 34,
        frameId: 34,
        parentFrameId: 34,
        method: 'GET',
        type: 11,
        url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
        requestHeaders: mockRequestHeaders(),
        originUrl: 'http://cliqztest.com',
        sourceUrl: 'http://cliqztest.com',
        isPrivate: false,
      });
      chai.expect(response).to.have.property('redirectUrl');
      chai.expect(response.redirectUrl).to.not.contain(uid);
      chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
    });

    it('removes also after subsequent redirect with same uid', function () {
      const mainDoc = WebRequestPipeline.onBeforeRequest({
        tabId: 34,
        frameId: 34,
        parentFrameId: 34,
        method: 'GET',
        type: 6,
        url: 'http://cliqztest.com/',
        requestHeaders: mockRequestHeaders(),
        originUrl: '',
        sourceUrl: '',
      });
      chai.expect(mainDoc).to.not.have.property('cancel');
      chai.expect(mainDoc).to.not.have.property('redirectUrl');
      chai.expect(mainDoc).to.not.have.property('requestHeaders');
      let response = WebRequestPipeline.onBeforeRequest({
        tabId: 34,
        frameId: 34,
        parentFrameId: 34,
        method: 'GET',
        type: 11,
        url: `http://tracker.com/track;uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
        requestHeaders: mockRequestHeaders(),
        originUrl: 'http://cliqztest.com',
        sourceUrl: 'http://cliqztest.com',
        isPrivate: false,
      });
      chai.expect(response).to.have.property('redirectUrl');
      chai.expect(response.redirectUrl).to.not.contain(uid);
      chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));

      response = WebRequestPipeline.onBeforeRequest({
        tabId: 34,
        frameId: 34,
        parentFrameId: 34,
        method: 'GET',
        type: 11,
        url: `http://tracker.com/track;uid=cliqz.com/tracking&uid2=cliqz.com/tracking&uid=${uid}?uid2=${uid}&encuid=${encodeURIComponent(uid)}`,
        requestHeaders: mockRequestHeaders(),
        originUrl: 'http://cliqztest.com',
        sourceUrl: 'http://cliqztest.com',
        isPrivate: false,
      });
      chai.expect(response).to.have.property('redirectUrl');
      chai.expect(response.redirectUrl).to.not.contain(uid);
      chai.expect(response.redirectUrl).to.not.contain(encodeURIComponent(uid));
    });
  });
});
