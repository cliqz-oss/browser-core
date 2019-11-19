import { isGhostery } from '../core/platform';
import { chrome } from '../platform/globals';

/* eslint-disable import/prefer-default-export */
export function getResourceUrl() {
  const prefix = isGhostery ? 'cliqz' : 'modules';
  return chrome.runtime.getURL(`${prefix}/popup-notification/`);
}
/* eslint-enable import/prefer-default-export */
