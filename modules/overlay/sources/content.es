/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerContentScript } from '../core/content/register';
import { documentBodyReady } from '../core/content/helpers';
import createModuleWrapper from '../core/helpers/action-module-wrapper';

import OverlayDropdownManager from '../dropdown/managers/overlay';
import config from '../core/config';

const DEBUG = config.environment !== 'production';

function createFrame(dropdown) {
  if (dropdown.iframe) {
    return;
  }
  dropdown.createIframeWrapper();
  ['onKeydown', 'onInput', 'onKeyPress', 'onBlur'].forEach((methodName) => {
    const eventName = methodName.slice(2).toLowerCase();
    dropdown.input.addEventListener(eventName, (ev) => {
      if (dropdown.isOverlayVisible) {
        ev.stopImmediatePropagation();
      }
      if (eventName !== 'blur' && dropdown[methodName](ev)) {
        ev.preventDefault();
      }
    });
  });
  dropdown.ui.addEventListener('click', (ev) => {
    if (ev.target === dropdown.ui) {
      ev.stopImmediatePropagation();
      dropdown.close();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }, true);
  window.addEventListener('message', dropdown.onMessage);
  window.addEventListener('keyup', (event) => {
    if (dropdown.isOverlayVisible) {
      event.stopImmediatePropagation();
    }
    if (dropdown.isOpen) {
      event.stopPropagation();
    }
  }, true);
}

function onLoad(window) {
  const search = createModuleWrapper('search');
  const core = createModuleWrapper('core');
  const freshtab = createModuleWrapper('freshtab');
  const cliqz = {
    core,
    search,
    freshtab,
  };

  const dropdown = new OverlayDropdownManager({
    cliqz,
    debug: DEBUG,
  });

  if (DEBUG) {
    if (!window.CLIQZ) {
      // eslint-disable-next-line no-param-reassign
      window.CLIQZ = {};
    }
    if (!window.CLIQZ.tests) {
      // eslint-disable-next-line no-param-reassign
      window.CLIQZ.tests = {};
    }
    // eslint-disable-next-line no-param-reassign
    window.CLIQZ.tests.overlay = {
      toggle: () => {
        createFrame(dropdown);
        dropdown.toggle('FromTests');
      },
      fillIn(query) {
        dropdown.input.value = query;
        dropdown._syncQueryWithUrlbar();
        dropdown._queryCliqz(query);
      },
      close: () => {
        dropdown.close();
      }
    };
  }

  // Return content action handlers
  return {
    'toggle-quicksearch': async ({ trigger, query }) => {
      await documentBodyReady(); // make sure `document.body` exists
      createFrame(dropdown);
      dropdown.toggle(trigger, query || '');
    },
  };
}

registerContentScript({
  module: 'overlay',
  matches: ['<all_urls>'],
  js: [onLoad],
});
