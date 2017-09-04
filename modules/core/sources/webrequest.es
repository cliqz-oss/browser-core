import WebRequest, { VALID_RESPONSE_PROPERTIES as EXTRA_PROPERTIES } from '../platform/webrequest';

// valid response properties as per webrequest Spec
const SPEC_RESPONSE_PROPERTIES = ['cancel', 'redirectUrl', 'requestHeaders',
  'responseHeaders', 'authCredentials'];

export const VALID_RESPONSE_PROPERTIES = SPEC_RESPONSE_PROPERTIES.concat(EXTRA_PROPERTIES || []);

export default WebRequest;
