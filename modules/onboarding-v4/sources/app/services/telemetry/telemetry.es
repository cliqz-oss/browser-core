/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import telemetry from './base';

// control center popup

export function popupCCshow() {
  telemetry('metrics.onboarding-v4.show', { view: 'message_cc' });
}

export function popupCCTryNow() {
  telemetry('metrics.onboarding-v4.click', { view: 'message_cc', target: 'try_now' });
}

export function popupCCSkip() {
  telemetry('metrics.onboarding-v4.click', { view: 'message_cc', target: 'skip' });
}

export function popupCCClose() {
  telemetry('metrics.onboarding-v4.click', { view: 'message_cc', target: 'close' });
}

export function showStep(view) {
  telemetry('metrics.onboarding-v4.show', { view });
}

// antitracking tooltip

export function trackingInfoShow() {
  telemetry('metrics.onboarding-v4.show', { view: 'tracking_info' });
}

export function trackingInfoClick() {
  telemetry('metrics.onboarding-v4.click', { view: 'tracking_info', target: 'learn_more' });
}

export function onToggle(view) {
  telemetry('metrics.onboarding-v4.click', { view, target: 'toggle' });
}

export function importData() {
  telemetry('metrics.onboarding-v4.click', { view: 'import-data', target: 'import' });
}

export function dotsClick(view, index) {
  telemetry('metrics.onboarding-v4.click', { view, index, target: 'menu_right' });
}

export function nextBtnClick(view) {
  telemetry('metrics.onboarding-v4.click', { view, target: 'next' });
}

export function skipBtnClick(view) {
  telemetry('metrics.onboarding-v4.click', { view, target: 'skip' });
}

// popup protection

export function popupProtectionShow() {
  telemetry('metrics.onboarding-v4.show', { view: 'popup_protection' });
}

export function popupProtectionClose() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_protection', target: 'close' });
}

export function popupProtectionActivate() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_protection', target: 'activate' });
}

export function popupProtectionProceed() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_protection', target: 'proceed' });
}

export function popupProtectionHide() {
  telemetry('metrics.onboarding-v4.hide', { view: 'popup_protection' });
}

// popup skip

export function popupSkipShow() {
  telemetry('metrics.onboarding-v4.show', { view: 'popup_skip' });
}

export function popupSkipClose() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_skip', target: 'close' });
}

export function popupSkipContinue() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_skip', target: 'continue' });
}

export function popupSkipSkip() {
  telemetry('metrics.onboarding-v4.click', { view: 'popup_skip', target: 'skip' });
}

export function popupSkipHide() {
  telemetry('metrics.onboarding-v4.hide', { view: 'popup_skip' });
}

export function shareDataClick() {
  telemetry('metrics.onboarding-v4.click', { view: 'intro', target: 'share-data-btn' });
}
