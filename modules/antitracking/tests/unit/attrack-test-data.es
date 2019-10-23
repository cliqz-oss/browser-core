/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

module.exports = {
  thirdpartyscript: {
    tab: {
      id: 66,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/thirdpartyscript.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/thirdpartyscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'script',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/thirdpartyscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'script',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/thirdpartyscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'script',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 66,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/thirdpartyscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/thirdpartyscript.html'
      }
    ]
  },
  injectedscript: {
    tab: {
      id: 69,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/injectedscript.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/injectedscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'script',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/injectedscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'script',
        originUrl: 'http://localhost:60508/injectedscript.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/injectedscript.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/injectedscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/injectedscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 69,
        type: 'script',
        originUrl: 'http://localhost:60508/injectedscript.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/injectedscript.html'
      }
    ]
  },
  imgtest: {
    tab: {
      id: 72,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/imgtest.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/imgtest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/imgtest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/imgtest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/imgtest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 72,
        type: 'image',
        originUrl: 'http://localhost:60508/imgtest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/imgtest.html'
      }
    ]
  },
  crossdomainxhr: {
    tab: {
      id: 75,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/crossdomainxhr.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/crossdomainxhr.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'script',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/crossdomainxhr.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'script',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/crossdomainxhr.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'script',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 75,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/crossdomainxhr.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/crossdomainxhr.html'
      }
    ]
  },
  iframetest: {
    tab: {
      id: 78,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/iframetest.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/iframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'script',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe.html',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/iframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'script',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe.html',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/iframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/iframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'script',
        originUrl: 'http://localhost:60508/iframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe.html',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/iframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/iframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 81,
        parentFrameId: 0,
        tabId: 78,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/iframetest.html'
      }
    ]
  },
  image302test: {
    tab: {
      id: 84,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/image302test.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/image302test.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/image302test.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/image302test.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/image302test.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/tracker302.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        statusCode: 302,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://localhost:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      },
      {
        url: 'http://127.0.0.1:60508/test.gif?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 84,
        type: 'image',
        originUrl: 'http://localhost:60508/image302test.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/image302test.html'
      }
    ]
  },
  nestediframetest: {
    tab: {
      id: 87,
      incognito: false,
      active: true,
      url: 'http://localhost:60508/nestediframetest.html',
    },
    onBeforeRequest: [
      {
        url: 'http://localhost:60508/nestediframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'script',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/proxyiframe.html',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'script',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe2.html',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      }
    ],
    onBeforeSendHeaders: [
      {
        url: 'http://localhost:60508/nestediframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'script',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/proxyiframe.html',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'script',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe2.html',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      }
    ],
    onHeadersReceived: [
      {
        url: 'http://localhost:60508/nestediframetest.html',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'main_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'script',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/proxyiframe.html',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://cliqztest2.de:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 90,
        parentFrameId: 0,
        tabId: 87,
        type: 'script',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://localhost:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 0,
        parentFrameId: -1,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://localhost:60508/nestediframetest.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/iframe2.html',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'sub_frame',
        originUrl: 'http://cliqztest2.de:60508/proxyiframe.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/vendor/jquery.min.js',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'script',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: true,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      },
      {
        url: 'http://127.0.0.1:60508/test?callback=func&uid=04C2EAD03BAB7F5E-2E85855CF4C75134',
        method: 'GET',
        frameId: 93,
        parentFrameId: 90,
        tabId: 87,
        type: 'xmlhttprequest',
        originUrl: 'http://127.0.0.1:60508/iframe2.html',
        statusCode: 200,
        isPrivate: false,
        fromCache: false,
        tabUrl: 'http://localhost:60508/nestediframetest.html'
      }
    ]
  }
};
