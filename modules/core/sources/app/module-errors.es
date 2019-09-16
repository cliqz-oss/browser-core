/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export class ModuleMissingError extends Error {
  constructor(moduleName) {
    super(`module '${moduleName}' is missing`);
    this.name = 'ModuleMissingError';
  }
}

export class ModuleDisabledError extends Error {
  constructor(moduleName) {
    super(`module '${moduleName}' is disabled`);
    this.name = 'ModuleDisabledError';
  }
}

export class ActionMissingError extends Error {
  constructor(moduleName, actionName) {
    super(`action '${actionName}' is not defined on module '${moduleName}'`);
    this.name = 'ActionMissingError';
  }
}
