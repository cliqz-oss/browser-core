/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const PASSIVE_EVENTS = [
  'input',
  'paste',
  'focus',
  'blur',
  'mouseup',
  'drop',
];

export const PREVENTABLE_EVENTS = [
  'keydown',
  'keypress',
  'mouseup',
];

export const TAB_CHANGE_EVENTS = [
  'TabClose',
  'TabSelect'
];

export const PASSIVE_LISTENER_OPTIONS = {
  passive: true,
  mozSystemGroup: true,
};

export const PREVENTABLE_LISTENER_OPTIONS = {
  passive: false,
};

export function stopEvent(event) {
  event.stopImmediatePropagation();
  event.stopPropagation();
  event.preventDefault();
}
