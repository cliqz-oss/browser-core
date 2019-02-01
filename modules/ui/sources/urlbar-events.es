import utils from '../core/utils';
import events from '../core/events';
import { nextTick } from '../core/decorators';
import console from '../core/console';
import { getCurrentTabId } from '../core/tabs';
import { isOnionModeFactory } from '../core/platform';
import prefs from '../core/prefs';

const ACproviderName = 'cliqz-results';
const lastEvent = new WeakMap();
const isOnionMode = isOnionModeFactory(prefs);

export default {
  /**
   * In order to prevent autocompletion blinking we shift selection range
   * if the subsequent query matches the previous completion
   */
  keypress(ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) {
      return;
    }

    const urlbar = this.urlbar;
    const mInputField = urlbar.mInputField;
    const hasSelection = mInputField.selectionEnd !== mInputField.selectionStart;

    if (
      hasSelection
      && this.window.CLIQZ.UI.renderer.hasAutocompleted
      && mInputField.value[mInputField.selectionStart] === String.fromCharCode(ev.charCode)
    ) {
      let query = urlbar.value;
      const queryWithCompletion = mInputField.value;
      const start = mInputField.selectionStart;
      query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(ev.charCode);

      // Prevent sending the new query
      ev.preventDefault();

      // This reset mInput.value
      mInputField.setUserInput(query);

      // So it has to be restored to include completion
      mInputField.value = queryWithCompletion;

      // Update completion
      mInputField.setSelectionRange(start + 1, mInputField.value.length);
    }
  },

  mouseup(event) {
    if (event.originalTarget.getAttribute('anonid') === 'historydropmarker') {
      events.pub('urlbar:dropmarker-click', {
        windowId: this.windowId,
        tabId: getCurrentTabId(this.window),
      });
    }
  },
  /**
  * Urlbar focus event
  * @event focus
  */
  focus() {
    if (this.urlbar.cliqzFocused) {
      return;
    }

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
    if (!isOnionMode()) {
      this.pingCliqzResults();
    }

    utils.setSearchSession();
    this.urlbarEvent('focus');
    events.pub('urlbar:focus', {
      windowId: this.windowId,
      tabId: getCurrentTabId(this.window),
      isPrivate: utils.isPrivateMode(this.window),
    });
  },
  /**
  * Urlbar blur event
  * @event blur
  * @param ev
  */
  blur() {
    if (this.urlbar.cliqzFocused) {
      return;
    }

    this.urlbarEvent('blur');

    // Update the url bar value to be its visible value
    if (this.urlbar.mInputField.selectionEnd > this.urlbar.mInputField.selectionStart) {
      this.urlbar.value = this.urlbar.mInputField.value;
    }

    events.pub('urlbar:blur', {
      windowId: this.windowId,
      tabId: getCurrentTabId(this.window),
    });
  },
  /**
  * Urlbar drop event
  * @event drop
  * @param ev
  */
  drop(ev) {
    const dTypes = ev.dataTransfer.types;
    if ((dTypes.indexOf && dTypes.indexOf('text/plain') !== -1)
      || (dTypes.contains && dTypes.contains('text/plain') !== -1)) {
      utils.telemetry({
        type: 'activity',
        action: 'textdrop'
      });
    }
  },

  input() {
    nextTick(() => {
      const input = this.urlbar.mInputField;
      const hasSelection = input.selectionStart !== input.selectionEnd;
      let query = input.value;
      const ev = lastEvent.get(this.window);

      if (hasSelection) {
        query = query.slice(0, input.selectionStart);
      }

      events.pub('urlbar:input', {
        isPrivate: utils.isPrivateMode(this.window),
        isTyped: this.urlbar.valueIsTyped,
        query,
        tabId: getCurrentTabId(this.window),
        windowId: this.windowId,
        keyCode: (ev && ev.code) || null,
        isPasted: ev && (ev.type === 'paste'),
      });
    });
  },

  keydown(ev) {
    lastEvent.set(this.window, ev);
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
    events.pub('urlbar:keydown', {
      windowId: this.windowId,
      tabId: getCurrentTabId(this.window),
      isHandledByCliqz: cancel,
      query: this.urlbar.value,
      code: ev.code,
    });
  },
  /**
  * Urlbar paste event
  * @event paste
  * @param ev
  */
  paste(ev) {
    lastEvent.set(this.window, ev);
    // wait for the value to change
    nextTick(() => {
      // ensure the lastSearch value is always correct
      // although paste event has 1 second throttle time.
      utils.telemetry({
        type: 'activity',
        action: 'paste',
        current_length: ev.target.value.length
      });
    }, 0);
  }
};
