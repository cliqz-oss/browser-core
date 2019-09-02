/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// https://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax-babel

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

/**
 * If you get an error in HPN, this function will give you
 * a hint whether retrying with the same message again later
 * is a reasonable strategy.
 *
 * That avoids futile attempts, as some types of errors are permanent.
 * For example, once you exceed the rate limit, retrying with the same
 * message (with the identical timestamp) will only trigger the same error.
 *
 * But note that even for recoverable errors, retrying immediately is
 * almost never a good idea. When you get an error, it means HPN already
 * exhausted the basic options (e.g., retrying failing HTTP requests).
 */
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

export class MsgQuotaError extends PermanentError {}
export class NotReadyError extends RecoverableError {}
export class InvalidMsgError extends PermanentError {}
export class NoCredentialsError extends RecoverableError {}
export class BadCredentialsError extends RecoverableError {}
export class SignMsgError extends PermanentError {}
export class TooBigMsgError extends PermanentError {}
export class TransportError extends RecoverableError {}
export class MsgTimeoutError extends RecoverableError {}
export class OldVersionError extends PermanentError {}
export class FetchConfigError extends RecoverableError {}
export class JoinGroupsError extends RecoverableError {}
export class InitSignerError extends PermanentError {}
export class ServerError extends RecoverableError {}
export class ClockOutOfSyncWhileJoining extends RecoverableError {}
