/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default function Welcome({ onClick }) {
  return (
    <div className="info-block">
      <div className="info-block-content">
        <div className="info-headline welcome-headline">
          <div>{t('goodbye')}</div>
          <div className="welcome-description">
            {t('goodbye_description')}
          </div>
        </div>
      </div>
      <div className="info-block-ctrl">
        <button
          type="button"
          className="welcome-ctrl-content"
          data-index="1"
          onClick={() => onClick(1)}
        >
          {t('goodbye_ctrl')}
        </button>
      </div>
    </div>
  );
}
