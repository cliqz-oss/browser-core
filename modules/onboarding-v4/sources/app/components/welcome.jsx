/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default function Welcome({
  onClick,
  visible,
}) {
  function getClassName() {
    const infoBlockClass = visible ? 'info-block' : 'info-block-hidden';
    return `${infoBlockClass} welcome`;
  }

  return (
    <div className={getClassName()}>
      <div className="info-block-content">
        <div className="info-headline welcome-headline">
          <div>{t('welcome')}</div>
          <div className="welcome-description">
            {t('welcome_description')}
          </div>
        </div>
      </div>
      <div className="info-block-ctrl">
        <button
          type="button"
          className="welcome-ctrl-content"
          data-index="1"
          onClick={onClick}
        >
          {t('welcome_ctrl')}
        </button>
      </div>
    </div>
  );
}
