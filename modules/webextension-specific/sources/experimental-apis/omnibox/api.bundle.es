/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* globals ExtensionAPI */
import Dropdown from './dropdownapi';
import URLBar from './urlbar';
import ExtensionGlobals from '../shared/extension-globals';

const { EventManager, windowTracker } = ExtensionGlobals;

const assert = (condition, errorMessage) => {
  if (!condition) {
    throw new ExtensionGlobals.ExtensionError(errorMessage || '');
  }
};

/**
 * Extension API that replaces default Firefox autocomplete with Cliqz search
 */
global.omnibox2 = class extends ExtensionAPI {
  _windows = new Map();

  _overriden = null;

  _override(context, { placeholder } = {}) {
    assert(context.viewType === 'background',
      'Dropdown override only allowed in background context');

    this._extension = context.extension;
    this._placeholder = placeholder;

    assert(this._overriden === null, 'Dropdown is already overriden');

    const readyPromises = [];
    windowTracker.addOpenListener(this._onWindowOpened);
    windowTracker.addCloseListener(this._onWindowClosed);
    for (const window of windowTracker.browserWindows()) {
      readyPromises.push(this._onWindowOpened(window));
    }
    this._overriden = Promise.all(readyPromises);
    return this._overriden;
  }

  _restore() {
    assert(context.viewType === 'background',
      'Dropdown override only allowed in background context');
    assert(this._overriden !== null, 'Dropdown is not overriden');

    this.close();
  }

  close() {
    windowTracker.removeOpenListener(this._onWindowOpened);
    windowTracker.removeCloseListener(this._onWindowClosed);
    for (const [window] of this._windows) {
      this._onWindowClosed(window);
    }
    this._overriden = null;
    this._windows.clear();
  }

  _onWindowOpened = async (window) => {
    // No need to create dropdown for windows that do not have urlbar or read only
    if (!window.locationbar.visible || window.gURLBar.readOnly) {
      return null;
    }

    const dropdown = new Dropdown({
      window,
      extension: this._extension,
      placeholder: this._placeholder,
    });
    dropdown.on('telemetry', this._onTelemetryPush);
    this._windows.set(window, dropdown);
    dropdown.enable();
    return dropdown.isReady();
  }

  _onWindowClosed = (window) => {
    const dropdown = this._windows.get(window);
    if (dropdown) {
      dropdown.off('telemetry', this._onTelemetryPush);
      dropdown.disable();
    }
  }

  _onTelemetryPush = (_, windowId, payload) => {
    this.emit('telemetry', windowId, payload);
  }

  _getWindow(windowId) {
    if (typeof windowId === 'number') {
      return windowTracker.getWindow(windowId, null);
    }
    return windowTracker.getCurrentWindow();
  }

  _getDropdown(windowId) {
    const w = this._getWindow(windowId);
    return this._windows.get(w);
  }

  _wrapDropdownAction(context, actionName) {
    return async (windowId, ...args) => {
      // Unlike Firefox, Cliqz does not close its extension pages on update, which means that
      // tabs should never call experimental APIs (extension context might because of restart).
      assert(context.viewType !== 'tab',
        `omnibox2.${actionName} cannot be called from tab context`);

      const dropdown = this._getDropdown(windowId);

      assert(dropdown !== undefined, `Cannot do "${actionName}": no dropdown in window #${windowId}`);
      assert(!dropdown.isDisabled, `Cannot do "${actionName}": dropdown in window #${windowId} is not initialized`);

      if (dropdown.isEnabling) {
        await dropdown.isReady();
      }
      return dropdown[actionName](...args);
    };
  }

  _wrapURLBarAction(context, actionName) {
    return (windowId, ...args) => {
      // Same as with `_wrapDropdownAction` it is not safe to allow calling experimental apis
      // from 'tab' context
      assert(context.viewType !== 'tab',
        `omnibox2.${actionName} cannot be called from tab context`);

      const w = this._getWindow(windowId);
      return URLBar[actionName](w, ...args);
    };
  }

  getAPI(context) {
    context.extension.callOnClose(this);

    return {
      omnibox2: {
        override: options => this._override(context, options),
        restore: () => this._restore(context),

        getResult: this._wrapDropdownAction(context, 'getResult'),
        query: this._wrapDropdownAction(context, 'query'),

        update: this._wrapURLBarAction(context, 'update'),
        navigateTo: this._wrapURLBarAction(context, 'navigateTo'),

        // events
        onTelemetryPush: new EventManager({
          context,
          name: 'dropdown.onTelemetry',
          register: (fire) => {
            const listener = (windowId, data) => fire.sync({
              windowId,
              data,
            });

            this.on('telemetry', listener);
            return () => {
              this.off('telemetry', listener);
            };
          }
        }).api(),
      },
    };
  }
};
