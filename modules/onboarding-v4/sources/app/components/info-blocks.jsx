/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

import Welcome from './welcome';
import Antitracking from './antitracking';
import Adblocking from './adblocking';
import Antiphishing from './antiphishing';
import ImportData from './import-data';
import Final from './final';

export default function InfoBlocks({
  currentStep,
  stepStates,
  onToggle,
  handleImportBtnClick,
  handleInfoNavigationClick,
  finalComponentDidUpdate,
}) {
  return (
    <div className={`info-blocks info-blocks-offset-${currentStep}`}>
      <Welcome
        visible={currentStep === 0}
        onClick={handleInfoNavigationClick}
      />

      <Antitracking
        visible={currentStep === 1}
        stepState={stepStates[1]}
        onToggle={onToggle}
      />

      <Adblocking
        visible={currentStep === 2}
        stepState={stepStates[2]}
        onToggle={onToggle}
      />

      <Antiphishing
        visible={currentStep === 3}
        stepState={stepStates[3]}
        onToggle={onToggle}
      />

      <ImportData
        visible={currentStep === 4}
        stepState={stepStates[4]}
        onClick={handleImportBtnClick}
      />

      <Final
        visible={currentStep === 5}
        finalComponentDidUpdate={finalComponentDidUpdate}
      />
    </div>
  );
}
