/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';

const TYPE = 'onboarding';

// control center popup

export function popupCCshow() {
  telemetry({
    type: TYPE,
    view: 'message_cc',
    action: 'show',
  });
}

export function popupCCTryNow() {
  telemetry({
    type: TYPE,
    view: 'message_cc',
    action: 'click',
    target: 'try_now',
  });
}

export function popupCCSkip() {
  telemetry({
    type: TYPE,
    view: 'message_cc',
    action: 'click',
    target: 'skip',
  });
}

export function popupCCClose() {
  telemetry({
    type: TYPE,
    view: 'message_cc',
    action: 'click',
    target: 'close',
  });
}

export function showStep(view) {
  telemetry({
    type: TYPE,
    view,
    action: 'show',
  });
}

// antitracking tooltip

export function trackingInfoShow() {
  telemetry({
    type: TYPE,
    view: 'tracking_info',
    action: 'show',
  });
}

export function trackingInfoClick() {
  telemetry({
    type: TYPE,
    view: 'tracking_info',
    action: 'click',
    target: 'learn_more',
  });
}

export function onToggle(view) {
  telemetry({
    type: TYPE,
    view,
    action: 'click',
    target: 'toggle',
  });
}

export function importData() {
  telemetry({
    type: TYPE,
    view: 'import-data',
    action: 'click',
    target: 'import',
  });
}

export function dotsClick(view, index) {
  telemetry({
    type: TYPE,
    view,
    action: 'click',
    target: 'menu_right',
    index,
  });
}

export function nextBtnClick(view) {
  telemetry({
    type: TYPE,
    view,
    action: 'click',
    target: 'next',
  });
}

export function skipBtnClick(view) {
  telemetry({
    type: TYPE,
    view,
    action: 'click',
    target: 'skip',
  });
}

// popup protection

export function popupProtectionShow() {
  telemetry({
    type: TYPE,
    view: 'popup_protection',
    action: 'show',
  });
}

export function popupProtectionClose() {
  telemetry({
    type: TYPE,
    view: 'popup_protection',
    action: 'click',
    target: 'close',
  });
}

export function popupProtectionActivate() {
  telemetry({
    type: TYPE,
    view: 'popup_protection',
    action: 'click',
    target: 'activate',
  });
}

export function popupProtectionProceed() {
  telemetry({
    type: TYPE,
    view: 'popup_protection',
    action: 'click',
    target: 'proceed',
  });
}

export function popupProtectionHide() {
  telemetry({
    type: TYPE,
    view: 'popup_protection',
    action: 'hide',
  });
}

// popup skip

export function popupSkipShow() {
  telemetry({
    type: TYPE,
    view: 'popup_skip',
    action: 'show',
  });
}

export function popupSkipClose() {
  telemetry({
    type: TYPE,
    view: 'popup_skip',
    action: 'click',
    target: 'close',
  });
}

export function popupSkipContinue() {
  telemetry({
    type: TYPE,
    view: 'popup_skip',
    action: 'click',
    target: 'continue',
  });
}

export function popupSkipSkip() {
  telemetry({
    type: TYPE,
    view: 'popup_skip',
    action: 'click',
    target: 'skip',
  });
}

export function popupSkipHide() {
  telemetry({
    type: TYPE,
    view: 'popup_skip',
    action: 'hide',
  });
}
