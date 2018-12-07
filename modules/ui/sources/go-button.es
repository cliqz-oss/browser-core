import utils from '../core/utils';
import { isUrl } from '../core/url';

export default function (window, search) {
  const $button = window.document.getElementById('urlbar-go-button')
    // FF56+
    || window.document.getAnonymousElementByAttribute(window.gURLBar, 'anonid', 'go-button')
    // FF58+?
    || window.document.getAnonymousElementByAttribute(window.gURLBar, 'anonid', 'urlbar-go-button');

  const urlbarGoClick = async () => {
    // Ticket EX-7519: DNS lookup leakage also happens
    // when clicking on a Browser Forward Button.
    const mInputFieldValue = await search.action(
      'queryToUrl', window.gURLBar.mInputField.value
    );
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
  };

  // There is a default click event handler
  // which is bound to $button by FF itself.
  // Save its' behaviour here and then call
  // it but after our custom logic is executed.
  const ffDefaultGoButtonClick = $button.onclick;
  $button.onclick = async (event) => {
    await urlbarGoClick(event);

    ffDefaultGoButtonClick(event);
  };

  const onClickBackup = $button.getAttribute('button');

  return {
    deattach() {
      $button.setAttribute('onclick', onClickBackup);
      $button.onclick = ffDefaultGoButtonClick;
    },
  };
}
