/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import runtime from '../../platform/runtime';

export default function createActionWrapperForModule(module) {
  // Call remote background action using `sendMessage`. These are then handled
  // by `content-communication-manager.es`, instantiated in `core/background.es`
  const actionHandler = (action, ...args) => runtime.sendMessage({
    module,
    action,
    args,
  });

  // Return a proxy so that people can call `module.actionName(...args)` instead
  // of `module.action('actionName', ...args)`. This is not strictly needed but
  // modules are expecting this API.
  return new Proxy({}, {
    get: (obj, prop) => {
      if (prop === 'action') {
        return actionHandler;
      }

      return actionHandler.bind(obj, prop);
    },
  });
}
