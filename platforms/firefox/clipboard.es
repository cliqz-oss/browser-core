import { Components } from './globals';

export function copyToClipboard(text) {
  const gClipboardHelper = Components.classes['@mozilla.org/widget/clipboardhelper;1']
    .getService(Components.interfaces.nsIClipboardHelper);
  gClipboardHelper.copyString(text);
}

export default {
  copyToClipboard,
};
