import utils from '../core/utils';

export function queryCliqz(query) {
  const urlBar = utils.getWindow().document.getElementById('urlbar');

  urlBar.mInputField.setUserInput('');
  urlBar.focus();
  urlBar.mInputField.focus();
  urlBar.mInputField.setUserInput(query);
}

export function openLink(url, focused = false) {
  const window = utils.getWindow();
  utils.openLink(
    window,
    url,
    true,
    false,
    false,
    focused
  );
}

export function handleQuerySuggestions() {
  // TBD
}

export function openTab() {}

export function getOpenTabs() {}

export function getReminders() {}

export function importBookmarks() {}
