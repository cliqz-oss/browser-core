/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';
import t from '../i18n';

export default function HistoryTitle({ dials: { history, isLoaded } }) {
  let title = '&nbsp;';
  if (isLoaded) {
    title = history.length
      ? t('app_speed_dials_row_history')
      : t('app_speed_dials_row_history_onboarding');
  }
  return (
    <div className="dial-header">
      {title}
    </div>
  );
}

HistoryTitle.propTypes = {
  dials: PropTypes.shape({
    history: PropTypes.array,
    isLoaded: PropTypes.bool,
  }),
};
