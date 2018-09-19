/* global fetch */
import { Components } from './globals';

if (typeof fetch === 'undefined') {
  Components.utils.importGlobalProperties(['fetch']);
}

export default fetch;

export function fetchFactory() {
  return fetch;
}

// fetch does not leak on Firefox
const isTrackableOriginHeaderFromOurExtension = false;

export {
  fetch,
  Headers,
  Request,
  Response,
  isTrackableOriginHeaderFromOurExtension
};
