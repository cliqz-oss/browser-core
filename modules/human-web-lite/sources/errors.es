/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// everything here was taken from hpnv2/errors.es
// (see comments there for details).

class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(message)).stack;
    }
  }
}

class RecoverableError extends ExtendableError {
  constructor(message) {
    super(message);
    this.isRecoverableHpnv2Error = true;
    this.isPermanentHpnv2Error = false;
  }
}

class PermanentError extends ExtendableError {
  constructor(message) {
    super(message);
    this.isRecoverableHpnv2Error = false;
    this.isPermanentHpnv2Error = true;
  }
}

export class TooBigMsgError extends PermanentError {}
export class TransportError extends RecoverableError {}
export class ProtocolError extends PermanentError {}
