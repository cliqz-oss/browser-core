
/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import CommonLayout from './common-layout';
import AntitrackingLayout from './antitracking-layout';
import InfoBlocks from './info-blocks';
import InfoNavigation from './info-navigation';
import WelcomeLayout from './welcome-layout';
import t from '../../i18n';

function getClassName(currentStep) {
  return currentStep === 5
    ? 'info info-final'
    : 'info';
}

export default function Layout({
  currentStep,
  stepStates,
  onToggle,
  handleShareDataClick,
  handleImportBtnClick,
  handleInfoNavigationClick,
  finalComponentDidUpdate,
  skipOnSkipClick,
}) {
  let adblockingLayoutClass = '';
  if (currentStep === 2) {
    adblockingLayoutClass = stepStates[2].enabled
      ? 'adblocking-layout-toggled'
      : 'adblocking-layout';
  }

  let antiphishingLayoutClass = '';
  if (currentStep === 3) {
    antiphishingLayoutClass = stepStates[3].enabled
      ? 'antiphishing-layout-toggled'
      : 'antiphishing-layout';
  }


  return (
    <div
      className="app-layouts"
    >
      <WelcomeLayout
        visible={currentStep === 0}
        handleShareDataClick={handleShareDataClick}
      />

      <AntitrackingLayout
        isToggled={stepStates[1].enabled}
        visible={currentStep === 1}
      />

      <CommonLayout
        visible={currentStep === 2}
        className={adblockingLayoutClass}
      />

      <CommonLayout
        visible={currentStep === 3}
        className={antiphishingLayoutClass}
      />

      <CommonLayout
        visible={currentStep === 4}
        className="import-data-layout"
      />

      {currentStep <= 5 && (
        <div className="info-layout">
          <div className={getClassName(currentStep)}>
            <InfoBlocks
              currentStep={currentStep}
              stepStates={stepStates}
              onToggle={onToggle}
              handleImportBtnClick={handleImportBtnClick}
              handleInfoNavigationClick={handleInfoNavigationClick}
              finalComponentDidUpdate={finalComponentDidUpdate}
            />

            {currentStep <= 4
              && (
                <InfoNavigation
                  currentStep={currentStep}
                  onClick={handleInfoNavigationClick}
                />
              )
            }

          </div>
          {currentStep <= 4
            && (
              <button type="button" className="info-layout-skip" onClick={skipOnSkipClick}>
                {t('welcome_skip')}
              </button>
            )
          }
        </div>
      )}
    </div>
  );
}
