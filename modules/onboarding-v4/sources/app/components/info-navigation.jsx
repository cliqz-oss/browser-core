/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

function getInfoNavigationItemClass(selected) {
  const className = 'info-navigation-item';
  return selected ? `${className}-selected` : className;
}

function renderNavigationButton(currentStep, step) {
  return (
    <button
      type="button"
      className={getInfoNavigationItemClass(currentStep === step)}
      data-index={step}
    />
  );
}

export default function InfoNavigation({
  currentStep,
  onClick,
}) {
  return (
    <div
      className="info-navigation"
      onClick={onClick}
      role="button"
      tabIndex="0"
      aria-pressed="false"
    >

      {renderNavigationButton(currentStep, 0)}
      {renderNavigationButton(currentStep, 1)}
      {renderNavigationButton(currentStep, 2)}
      {renderNavigationButton(currentStep, 3)}
      {renderNavigationButton(currentStep, 4)}

      {
        currentStep > 0
        && (
          <button
            type="button"
            className="info-navigation-back-item"
            data-index={currentStep - 1}
          >
            {t('button_back')}
          </button>
        )
      }
      {
        currentStep > 0
        && currentStep < 5
        && (
          <button
            type="button"
            className="info-navigation-next-item"
            data-index="next"
          >
            {t('button_next')}
          </button>
        )
      }
    </div>
  );
}
