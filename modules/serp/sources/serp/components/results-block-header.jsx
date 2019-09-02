/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../services/i18n';

export default ({ results = [], cssClasses = '' }) => {
  if (results.length > 0) {
    return (
      <div
        className={cssClasses}
      >
        {t('safe_search_from_cliqz')}
      </div>
    );
  }

  return null;
};
