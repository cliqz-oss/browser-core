import utils from '../core/utils';
import { isUrl } from '../core/url';

export default function (window) {
  const $button = window.document.getElementById('urlbar-go-button') ||
    // FF56+
    window.document.getAnonymousElementByAttribute(window.gURLBar, 'anonid', 'go-button') ||
    // FF58+?
    window.document.getAnonymousElementByAttribute(window.gURLBar, 'anonid', 'urlbar-go-button');

  const urlbarGoClick = (ev) => {
    const mInputFieldValue = window.gURLBar.mInputField.value;
    const isAutocompleted = window.gURLBar.value !== mInputFieldValue;

    // we somehow break default FF -> on goclick the autocomplete doesnt get considered
    /* eslint-disable no-param-reassign */
    window.gURLBar.value = mInputFieldValue;
    /* eslint-enable no-param-reassign */

    utils.telemetry({
      type: 'activity',
      position_type: [isUrl(mInputFieldValue) ? 'inbar_url' : 'inbar_query'],
      autocompleted: isAutocompleted,
      action: 'urlbar_go_click'
    });

    window.gURLBar.handleCommand(ev);
  };

  $button.addEventListener('click', urlbarGoClick);

  const onClickBackup = $button.getAttribute('button');

  return {
    deattach() {
      $button.setAttribute('onclick', onClickBackup);
      $button.removeEventListener('click', urlbarGoClick);
    },
  };
}
