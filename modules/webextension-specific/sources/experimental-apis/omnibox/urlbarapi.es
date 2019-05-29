/* global windowTracker, ChromeUtils */
import { nextTick } from '../../../core/decorators';

const { EventEmitter } = ChromeUtils.import('resource://gre/modules/EventEmitter.jsm');
const { ExtensionCommon } = ChromeUtils.import('resource://gre/modules/ExtensionCommon.jsm');
const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

const { EventManager } = ExtensionCommon;

const PASSIVE_EVENTS = [
  'input',
  'paste',
  'focus',
  'blur',
  'mouseup',
  'drop',
];

const PREVENTABLE_EVENTS = [
  'keydown',
  'keypress',
  'mouseup',
];

const PASSIVE_LISTENER_OPTIONS = {
  passive: true,
  mozSystemGroup: true,
};

const PREVENTABLE_LISTENER_OPTIONS = {
  passive: false,
};

export default class URLBar extends EventEmitter {
  _oldPlaceholder = null;

  _placeholder = null;

  constructor(extension, dropdown) {
    super();
    this._extension = extension;
    this._dropdown = dropdown;
    this._windows = new Map();
    this._lastEvent = new WeakMap();
    this.onWindowOpened = this._onWindowOpened.bind(this);
    this.onWindowClosed = this._onWindowClosed.bind(this);
    this._themePref = Services.prefs.getBranch('lightweightThemes.selectedThemeID');
    this._themePref.addObserver('', this);
    windowTracker.addOpenListener(this.onWindowOpened);
    windowTracker.addCloseListener(this.onWindowClosed);
    for (const window of windowTracker.browserWindows()) {
      this.onWindowOpened(window);
    }
    this._onThemeChange();
  }

  _getWindowId(window) {
    return windowTracker.getId(window);
  }

  _getWindow(windowId /* or window */) {
    let w = windowId;
    if (typeof windowId === 'number') {
      w = windowTracker.getWindow(windowId, null);
    } else if (windowId === null || windowId === undefined) {
      w = windowTracker.getCurrentWindow();
    }
    return w;
  }

  _getURLBarByWindowId(windowId) {
    const window = this._getWindow(windowId);
    if (window === null || !window.gURLBar) {
      return null;
    }
    return window.gURLBar;
  }

  _getValue(window) {
    const w = this._getWindow(window);
    return w.gURLBar.value;
  }

  destroy() {
    windowTracker.removeCloseListener(this.onWindowClosed);
    windowTracker.removeOpenListener(this.onWindowOpened);
    this._themePref.removeObserver('', this);
    for (const [window] of this._windows) {
      this._onWindowClosed(window);
    }
    this._windows.clear();
  }

  _onWindowOpened(window) {
    const urlbar = window.gURLBar;
    PASSIVE_EVENTS.forEach(eventName =>
      urlbar.addEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      urlbar.addEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    window.addEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);

    if (this._oldPlaceholder === null) {
      this._oldPlaceholder = urlbar.mInputField.placeholder;
    }

    if (this._placeholder) {
      nextTick(() => {
        urlbar.mInputField.placeholder = this._placeholder;
      });
    }

    this._windows.set(window, {});
    this._updateURLBarDimensions(window);
  }

  _onWindowClosed(window) {
    const windowData = this._windows.get(window);
    if (!windowData) {
      return;
    }

    const urlbar = window.gURLBar;
    PASSIVE_EVENTS.forEach(eventName =>
      urlbar.removeEventListener(eventName, this, PASSIVE_LISTENER_OPTIONS));
    PREVENTABLE_EVENTS.forEach(eventName =>
      urlbar.removeEventListener(eventName, this, PREVENTABLE_LISTENER_OPTIONS));
    window.removeEventListener('resize', this, PASSIVE_LISTENER_OPTIONS);

    if (this._oldPlaceholder !== null) {
      urlbar.mInputField.placeholder = this._oldPlaceholder;
    }
    this._windows.delete(window);
  }

  _getUrlbarEventDetails(event) {
    const properties = [
      'altKey',
      'code',
      'ctrlKey',
      'key',
      'metaKey',
      'shiftKey',
    ];
    return properties.reduce((memo, prop) => {
      memo[prop] = event[prop]; // eslint-disable-line
      return memo;
    }, {});
  }

  _onKeydown(event, dropdownState) {
    let preventDefault = false;
    const isDropdownOpen = dropdownState.height > 0;
    if (!isDropdownOpen) {
      if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        // handler should reopen popup here
        return true;
      }
    }

    switch (event.code) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Enter':
      case 'NumpadEnter':
        preventDefault = true;
        break;
      case 'Tab':
        if (isDropdownOpen) {
          preventDefault = true;
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (!event.shiftKey || event.metaKey || (event.altKey && event.ctrlKey)) {
          preventDefault = false;
          break;
        }
        preventDefault = true;
        break;
      default: {
        preventDefault = false;
      }
    }

    return preventDefault;
  }

  handleEvent(event) {
    const window = event.view || windowTracker.getCurrentWindow();
    let preventDefault = false;
    switch (event.type) {
      case 'focus':
      case 'blur':
        this._lastEvent.delete(window);
        this.emit(event.type, window, this._getURLBarDetails(window));
        break;
      case 'input':
        nextTick(() => {
          const urlbar = window.gURLBar;
          const ev = this._lastEvent.get(window);
          this.emit(event.type, window, {
            ...this._getURLBarDetails(window),
            isTyped: urlbar.valueIsTyped,
            keyCode: (ev && ev.code) || null,
            isPasted: ev && (ev.type === 'paste'),
          });
        });
        break;
      case 'paste':
        this._lastEvent.set(window, event);
        break;
      case 'keydown':
        this._lastEvent.set(window, event);
        preventDefault = this._onKeydown(event, this._dropdown.getState(window));
        this.emit(event.type, window, {
          defaultPrevented: preventDefault,
          ...this._getUrlbarEventDetails(event),
          ...this._getURLBarDetails(window),
        });
        break;
      case 'mouseup':
        if (event.originalTarget.getAttribute('anonid') === 'historydropmarker') {
          this.emit('dropmarker', window, this._getURLBarDetails(window));
        } else if (event.originalTarget.getAttribute('anonid') === 'urlbar-go-button') {
          this.emit('gotoaddress', window, this._getURLBarDetails(window));
          preventDefault = true;
        }
        break;
      case 'drop':
        this.emit('drop', event, {
          ...this._getURLBarDetails(window),
          dataTransfer: {
            types: event.dataTransfer.types,
          },
        });
        break;
      case 'keypress': {
        if (event.ctrlKey || event.altKey || event.metaKey) {
          break;
        }
        const urlbar = window.gURLBar;
        const mInputField = urlbar.mInputField;
        const hasCompletion = mInputField.selectionEnd !== mInputField.selectionStart
          && mInputField.value.length > 1;
        if (
          hasCompletion
          && mInputField.value[mInputField.selectionStart] === String.fromCharCode(event.charCode)
        ) {
          let query = urlbar.value;
          const queryWithCompletion = mInputField.value;
          const start = mInputField.selectionStart;
          query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(event.charCode);

          // Prevent sending the new query
          event.preventDefault();

          // This reset mInput.value
          mInputField.setUserInput(query);

          // So it has to be restored to include completion
          mInputField.value = queryWithCompletion;

          // Update completion
          mInputField.setSelectionRange(start + 1, mInputField.value.length);
        }
        break;
      }
      case 'resize': {
        this._updateURLBarDimensions(window);
        this._dropdown.updateMaxHeight(window);
        break;
      }
      default:
        break;
    }
    if (preventDefault) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  _onThemeChange() {
    nextTick(() => {
      const window = this._getWindow();
      const CHANNEL_TRESHOLD = 220;
      const toolbar = window.document.getElementById('nav-bar');
      const bgColor = window.getComputedStyle(toolbar)['background-color'];

      // Check if toolbar background color is light-grey-ish and non-transparent
      const [, r, g, b, a] = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?/) || ['', '0', '0', '0', '0'];
      if (r > CHANNEL_TRESHOLD
          && g > CHANNEL_TRESHOLD
          && b > CHANNEL_TRESHOLD
          && (a === undefined || a >= 1)
      ) {
        this._color = bgColor;
      } else {
        this._color = null;
      }
    });
  }

  _updateURLBarDimensions(window) {
    const details = this._windows.get(window);
    if (!details) {
      return;
    }
    const urlbar = window.gURLBar;

    const urlbarRect = urlbar.getBoundingClientRect();
    const urlbarLeftPos = Math.round(urlbarRect.left || urlbarRect.x || 0);
    const urlbarWidth = urlbarRect.width;
    const extraPadding = 10;
    let contentPadding = extraPadding + urlbarLeftPos;

    // Reset padding when there is a big space on the left of the urlbar
    // or when the browser's window is too narrow
    // WARNING: magic numbers!
    if (contentPadding > 500 || window.innerWidth < 650) {
      contentPadding = 50;
    }
    Object.assign(details, {
      padding: contentPadding,
      left: urlbarLeftPos,
      width: urlbarWidth,
    });
  }

  _setPlaceholder(placeholder) {
    this._placeholder = placeholder;
    for (const window of windowTracker.browserWindows()) {
      if (this._oldPlaceholder === null) {
        this._oldPlaceholder = window.gURLBar.mInputField.placeholder;
      }
      window.gURLBar.mInputField.placeholder = placeholder;
    }
  }

  _getTabDetails(windowId) {
    const window = this._getWindow(windowId);
    const tabData = this._extension.tabManager.convert(window.gBrowser.selectedTab);
    const incognito = tabData.incognito
      // autofrget tab
      || (window.gBrowser.selectedBrowser.loadContext
          && window.gBrowser.selectedBrowser.loadContext.usePrivateBrowsing);

    return {
      incognito,
      tabId: tabData.id,
    };
  }

  _getURLBarDetails(windowId) {
    const window = this._getWindow(windowId);
    if (!window) {
      return {};
    }
    const details = this._windows.get(window);
    return {
      ...this._getURLBarTextContent(windowId),
      ...details,
      navbarColor: this._color,
      ...this._getTabDetails(windowId),
    };
  }

  _getURLBarTextContent(windowId) {
    const urlbar = this._getURLBarByWindowId(windowId);

    return {
      value: urlbar.value,
      visibleValue: urlbar.mInputField.value,
      searchString: urlbar.controller.searchString,
      selectionStart: urlbar.selectionStart,
      selectionEnd: urlbar.selectionEnd,
      focused: urlbar.focused,
    };
  }

  /**
   * Generates a EventManager for given eventName and context.
   * Available only in background context.
   *
   * @param  {string} eventName
   * @return {function}
   */
  _generateEventManager(context, eventName) {
    const name = eventName[0].toUpperCase() + eventName.slice(1);

    return new EventManager({
      context,
      name: `urlbar.on${name}`,
      inputHandling: true,
      register: (fire) => {
        const listener = (_, window, details = {}) => {
          if (context.viewType === 'background') {
            fire.sync({
              ...details,
              windowId: this._getWindowId(window),
            });
          }
        };
        this.on(eventName, listener);
        return () => {
          this.off(eventName, listener);
        };
      }
    }).api();
  }

  observe(subject, topic, data) {
    if (topic === 'nsPref:changed') {
      this._onThemeChange(subject, topic, data);
    }
  }

  updateMany(windowId = null, details) {
    const urlbar = this._getURLBarByWindowId(windowId);
    details.forEach((d) => {
      // 1. focus/blur
      if (d.focused !== null) {
        if (urlbar.focused !== d.focused) {
          urlbar[d.focused ? 'focus' : 'blur']();
          if (d.triggerFocusEvent) {
            this.emit(d.focused ? 'focus' : 'blur', urlbar.ownerGlobal, this._getURLBarDetails(windowId));
          }
        }
        if (d.triggerOpenLocation) {
          const command = urlbar.ownerDocument.getElementById('Browser:OpenLocation');
          command.doCommand();
        }
      }

      // 2. value/selection change
      let valueChanged = false;
      if (typeof d.value === 'string' && urlbar.value !== d.value) {
        urlbar.value = d.value;
        valueChanged = true;
      }
      if (typeof d.visibleValue === 'string' && urlbar.mInputField.value !== d.visibleValue) {
        urlbar.mInputField.value = d.visibleValue;
        valueChanged = true;
      }
      if (typeof d.searchString === 'string' && urlbar.controller.searchString !== d.searchString) {
        urlbar.controller.searchString = d.searchString;
      }
      if (typeof d.selectionStart === 'number' && urlbar.selectionStart !== d.selectionStart) {
        urlbar.selectionStart = d.selectionStart;
        valueChanged = true;
      }
      if (typeof d.selectionEnd === 'number' && urlbar.selectionEnd !== d.selectionEnd) {
        urlbar.selectionEnd = d.selectionEnd;
        valueChanged = true;
      }

      if (d.triggerInputEvent && valueChanged) {
        this.emit('input', urlbar.ownerGlobal, this._getURLBarDetails(windowId));
      }
    });
    return this._getURLBarDetails(windowId);
  }

  getAPI(context) {
    return {
      enter: (windowId = null, newTab = false) => {
        const urlbar = this._getURLBarByWindowId(windowId);
        urlbar.handleCommand(null, newTab ? 'tabshifted' : 'current');
      },
      focus: (windowId = null, options) => this.updateMany(windowId, [{
        focused: true,
        triggerFocusEvent: options.triggerEvent,
        triggerOpenLocation: options.openLocation,
      }]),
      blur: (windowId = null) => this.updateMany(windowId, [{
        focused: false,
        triggerFocusEvent: null,
        triggerOpenLocation: null,
      }]),
      get: (windowId = null) => this._getURLBarDetails(windowId),
      setPlaceholder: placeholder => this._setPlaceholder(placeholder),
      update: (windowId = null, details) => this.updateMany(windowId, [{
        focused: null,
        triggerFocusEvent: null,
        triggerOpenLocation: null,
        triggerInputEvent: details.triggerEvent,
        ...details,
      }]),
      updateMany: (...args) => this.updateMany(...args),
      complete: (windowId = null, query, completion) => {
        const urlbar = this._getURLBarByWindowId(windowId);
        const newValue = `${query}${completion}`;
        const currentValue = urlbar.controller.searchString;
        // Unlike "update", this method changes urlbar ONLY IF the current value can be completed
        // to match the new one.
        if (query !== currentValue
          && (query.startsWith(currentValue) || currentValue.startsWith(query))) {
          return this._getURLBarDetails(windowId);
        }

        urlbar.mInputField.value = newValue;
        urlbar.mInputField.selectionStart = query.length;
        urlbar.mInputField.selectionEnd = newValue.length;
        return this._getURLBarDetails(windowId);
      },
      onInput: this._generateEventManager(context, 'input'),
      onKeydown: this._generateEventManager(context, 'keydown'),
      onFocus: this._generateEventManager(context, 'focus'),
      onBlur: this._generateEventManager(context, 'blur'),
      onDrop: this._generateEventManager(context, 'drop'),
      onDropmarker: this._generateEventManager(context, 'dropmarker'),
      onGotoAddress: this._generateEventManager(context, 'gotoaddress'),
    };
  }
}
