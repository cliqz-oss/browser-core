/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* global ChromeUtils, windowTracker */
const { UITour } = ChromeUtils.import('resource:///modules/UITour.jsm');

// Allow showing/hiding on active window only for now
// showHighlight is not supported yet as there is a bug related to it
// UITour.showHighlight(aWindow, target, 'wobble');

export function createUITourTarget(targetId, widgetQuery, widgetName) {
  UITour.targets.set(targetId,
    {
      query: widgetQuery, // e.g. '#searchbar',
      widgetName, // e.g. 'search-container',
      allowAdd: true,
    });
}

export function deleteUITourTarget(targetId) {
  UITour.targets.delete(targetId);
}

export function hideUITour() {
  const aWindow = windowTracker.topWindow;
  UITour.hideInfo(aWindow);
}

export function showUITour(settings, ctaButton, skipButton) {
  const aWindow = windowTracker.topWindow;
  const aDocument = aWindow.document;
  const tooltip = aDocument.getElementById('UITourTooltip');
  if (tooltip.state === 'showing' || tooltip.state === 'open') {
    hideUITour();
    return Promise.resolve('showing');
  }

  return new Promise((resolve) => {
    const buttons = [];
    if (ctaButton) {
      buttons.push({
        label: ctaButton.label,
        style: ctaButton.style,
        callback: () => resolve('CTA'),
      });
    }

    if (skipButton) {
      buttons.push({
        label: skipButton.label,
        style: skipButton.style,
        callback: () => resolve('skip'),
      });
    }

    const options = {
      closeButtonCallback: () => resolve('close'),
    };

    const { targetId, title, text, icon } = settings;

    UITour.getTarget(aWindow, targetId).then(target =>
      UITour.showInfo(aWindow, target, title, text, icon, buttons, options));
  });
}
