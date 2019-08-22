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
  visible,
}) {
  return (
    <div
      className={`step welcome ${visible ? 'show' : ''}`}
    >
      <div className="welcome-text">
        {t('welcome')}
      </div>
    </div>
  );
}
