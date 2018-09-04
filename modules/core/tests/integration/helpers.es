/* eslint-disable */

export * from '../test-helpers';
export { getResourceUrl } from '../../../core/platform';

import { getMessage } from '../../../core/i18n';

export function getLocalisedString(key) {
  return getMessage(key);
}
