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

export class MsgQuotaError extends ExtendableError {}
export class NotReadyError extends ExtendableError {}
export class InvalidMsgError extends ExtendableError {}
export class NoCredentialsError extends ExtendableError {}
export class BadCredentialsError extends ExtendableError {}
export class SignMsgError extends ExtendableError {}
export class TooBigMsgError extends ExtendableError {}
export class TransportError extends ExtendableError {}
export class MsgTimeoutError extends ExtendableError {}
export class OldVersionError extends ExtendableError {}
export class WrongClockError extends ExtendableError {}
export class FetchConfigError extends ExtendableError {}
export class JoinGroupsError extends ExtendableError {}
export class InitSignerError extends ExtendableError {}
export class ServerError extends ExtendableError {}
