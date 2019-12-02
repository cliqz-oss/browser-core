import { chrome } from '../platform/globals';

export default function t(key, params = []) {
  return chrome.i18n.getMessage(key, params);
}
