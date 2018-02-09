/*
 * SecVM experiment
 * Valentin Hartmann, Robert West - EPFL
 * Author: Valentin Hartmann
*/

import {
  registerContentScript,
  CHROME_MSG_SOURCE
} from '../core/content/helpers';

// TODO: Try to find a way to check already here if the label has been
// extracted before.
export default function parseDom(window, windowId) {
  const document = window.document;

  const aElements = document.getElementsByTagName('a') || [];
  let accountName;
  for (let i = 0; i < aElements.length; i += 1) {
    const title = aElements[i].getAttribute('title');
    // German || English
    if (title === 'Profil' || title === 'Profile') {
      accountName = aElements[i].href;
      accountName = accountName.slice(accountName.lastIndexOf('/') + 1);
      break;
    }
  }


  const scriptElements = document.getElementsByTagName('script') || [];
  const stringBeforeLabel = `${accountName}?fref=ufi",gender:`;
  let label;
  for (let i = 0; i < scriptElements.length; i += 1) {
    const labelPosition = scriptElements[i].text.indexOf(stringBeforeLabel);
    if (labelPosition !== -1) {
      label = scriptElements[i].text.charAt(labelPosition + stringBeforeLabel.length);
      break;
    }
  }

  const payload = {
    module: 'secvm',
    action: 'label',
    args: [
      parseInt(label, 10)
    ]
  };

  chrome.runtime.sendMessage({
    source: CHROME_MSG_SOURCE,
    windowId,
    payload
  });
}

registerContentScript('https://www.facebook.com/', (window, chrome, windowId) => {
  window.addEventListener('load', () => {
    parseDom(window, windowId);
  });
});
