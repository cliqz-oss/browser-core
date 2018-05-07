import utils from '../core/utils';
import events from '../core/events';
import { nextTick } from '../core/decorators';
import console from '../core/console';
import { getCurrentTabId } from '../core/tabs';
import { isOnionMode } from '../core/platform';

const ACproviderName = 'cliqz-results';
const lastEvent = new WeakMap();

export default {
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
    if (!isOnionMode) {
      utils.pingCliqzResults();
    }

    utils.setSearchSession(utils.rand(32));
    this.urlbarEvent('focus');
    events.pub('urlbar:focus', {
      windowId: this.windowId,
      tabId: getCurrentTabId(this.window),
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

  keyup(ev) {
    events.pub('urlbar:keyup', {
      windowId: this.windowId,
      tabId: getCurrentTabId(this.window),
      code: ev.code,
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
    this.window.setTimeout(() => {
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
