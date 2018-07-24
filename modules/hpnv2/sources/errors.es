// Extending native classes (Error) does not work well in Babel...
class HpnV2Error {
  constructor(message) {
    this.name = 'HpnV2Error';
    this.message = message;
    this.stack = (new Error()).stack;
  }
}

export class MsgQuotaError extends HpnV2Error {}
export class NotReadyError extends HpnV2Error {}
export class InvalidMsgError extends HpnV2Error {}
export class NoCredentialsError extends HpnV2Error {}
export class BadCredentialsError extends HpnV2Error {}
export class SignMsgError extends HpnV2Error {}
export class TooBigMsgError extends HpnV2Error {}
export class TransportError extends HpnV2Error {}
export class MsgTimeoutError extends HpnV2Error {}
export class OldVersionError extends HpnV2Error {}
export class WrongClockError extends HpnV2Error {}

class WrapError extends HpnV2Error {
  constructor(e) {
    super();
    this.originalError = e;
  }
}

export class InitUserPKError extends WrapError {}
export class FetchConfigError extends WrapError {}
export class JoinGroupsError extends WrapError {}
export class LoadCredentialsError extends WrapError {}
export class InitSignerError extends WrapError {}
