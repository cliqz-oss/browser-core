/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global describeModule */

// TODO

export default describeModule('core/http',
  function () {
    return {
      './console': {
        default: {}
      },
      './gzip': {
        default: {}
      },
      '../platform/xmlhttprequest': {
        default: {}
      },
      '../platform/chrome-url-handler': {
        default: {}
      },
      '../platform/fetch': {
        default: {}
      },
    };
  },
  function () {
    context('promiseHttpHandler', function () {
    });
  });
