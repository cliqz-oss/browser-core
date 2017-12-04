import utils from '../core/utils';
import autocomplete from '../autocomplete/autocomplete';
import SearchHistory from './search-history';
import console from '../core/console';

const ACproviderName = 'cliqz-results';

export default {
  /**
  * Urlbar focus event
  * @event focus
  */
  focus() {
    if (this.urlbar.getAttribute('autocompletesearch').indexOf(ACproviderName) === -1) {
      // BUMMER!! Something happened and our AC provider was overriden!
      // trying to set it back while keeping the new value in case Cliqz
      // gets disabled
      this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
      this.urlbar.setAttribute('autocompletesearch', ACproviderName);
      this.reloadUrlbar();
      this.urlbar.blur();
      setTimeout(() => {
        this.urlbar.focus();
      }, 0);
      return;
    }

    // try to 'heat up' the connection
    utils.pingCliqzResults();

    autocomplete.lastFocusTime = Date.now();
    SearchHistory.hideLastQuery(this.window);
    utils.setSearchSession(utils.rand(32));
    this.urlbarEvent('focus');
  },
  /**
  * Urlbar blur event
  * @event blur
  * @param ev
  */
  blur() {
    if (autocomplete.spellCheck) {
      autocomplete.spellCheck.resetState();
    }
    // reset this flag as it can block the dropdown from opening
    autocomplete.isPopupOpen = false;

    // force a dropdown close on urlbar blur
    this.window.CLIQZ.Core.popup.hidePopup();

    this.urlbarEvent('blur');

    // Update the url bar value to be its visible value
    if (this.urlbar.mInputField.selectionEnd > this.urlbar.mInputField.selectionStart) {
      this.urlbar.value = this.urlbar.mInputField.value;
    }

    autocomplete.lastFocusTime = null;
    this.window.CLIQZ.UI.sessionEnd();
  },
  /**
  * Urlbar keypress event
  * @event keypress
  * @param ev
  */
  keypress(ev) {
    if (!ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      const urlbar = this.urlbar;
      const mInputField = urlbar.mInputField;
      if (mInputField.selectionEnd !== mInputField.selectionStart &&
        mInputField.value[mInputField.selectionStart] === String.fromCharCode(ev.charCode)) {
        // prevent the redraw in urlbar but send the search signal
        let query = urlbar.value;
        const old = mInputField.value;
        const start = mInputField.selectionStart;
        query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(ev.charCode);
        mInputField.setUserInput(query);
        mInputField.value = old;
        mInputField.setSelectionRange(start + 1, mInputField.value.length);
        ev.preventDefault();
      }
    }
  },
  /**
  * Urlbar drop event
  * @event drop
  * @param ev
  */
  drop(ev) {
    const dTypes = ev.dataTransfer.types;
    if ((dTypes.indexOf && dTypes.indexOf('text/plain') !== -1) ||
      (dTypes.contains && dTypes.contains('text/plain') !== -1)) {
      // open dropdown on text drop
      const inputField = this.urlbar.mInputField;
      const val = inputField.value;
      inputField.setUserInput('');
      inputField.setUserInput(val);

      utils.telemetry({
        type: 'activity',
        action: 'textdrop'
      });
    }
  },
  keydown(ev) {
    autocomplete._lastKey = ev.keyCode;
    let cancel;
    try {
      cancel = this.window.CLIQZ.UI.keyDown(ev);
    } catch (e) {
      console.error(e);
      throw e;
    }
    if (cancel) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  },
  /**
  * Urlbar paste event
  * @event paste
  * @param ev
  */
  paste(ev) {
    // wait for the value to change
    this.window.setTimeout(() => {
      // ensure the lastSearch value is always correct
      // although paste event has 1 second throttle time.
      autocomplete.lastSearch = ev.target.value;
      utils.telemetry({
        type: 'activity',
        action: 'paste',
        current_length: ev.target.value.length
      });
    }, 0);
  }
};
