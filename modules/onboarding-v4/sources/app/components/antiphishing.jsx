/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default function Antiphishing({
  visible,
  onToggle,
  stepState,
}) {
  function getClassName() {
    const infoBlockClass = visible ? 'info-block' : 'info-block-hidden';
    const mainClass = stepState.enabled ? 'antiphishing-toggled' : 'antiphishing';
    return `${infoBlockClass} ${mainClass}`;
  }

  function getHeader() {
    return t('antiphishing_header');
  }

  function getDescription() {
    const keyToken = stepState.enabled
      ? 'antiphishing_description_on'
      : 'antiphishing_description_off';

    return (
      <div className="info-headline antiphishing-headline">
        <p>{t(`${keyToken}_1`)}</p>
        <p>{t(`${keyToken}_2`)}</p>
      </div>
    );
  }

  function getStatus() {
    return stepState.enabled ? t('status_on') : t('status_off');
  }

  function getStatusClass() {
    return stepState.enabled
      ? 'info-block-ctrl-toggled'
      : 'info-block-ctrl-status';
  }

  return (
    <div className={getClassName()}>
      <div className="info-block-content">
        {getDescription()}
      </div>
      <div className="info-block-ctrl">
        <span className="info-block-ctrl-content antiphishing-ctrl-content">
          {getHeader()}
        </span>
        <span className={getStatusClass()}>
          {getStatus()}
        </span>
        <label className="info-block-ctrl-switch switch">
          <input
            checked={stepState.enabled}
            className="toggle"
            onChange={onToggle}
            type="checkbox"
          />
          <span className="slider" />
        </label>
      </div>
    </div>
  );
}
