/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import classNames from 'classnames';
import SearchboxSubmitIcon from './searchbox-submit-icon';

export default ({
  handleSubmitIconClick,
  shouldDisplayLookAndFeelV1,
  shouldDisplayLookAndFeelV3,
  telemetryView,
  session,
}) => {
  const searchboxSubmitIconClasses = classNames({
    'searchbox-v1-submit-icon': shouldDisplayLookAndFeelV1,
    'searchbox-v3-submit-icon': shouldDisplayLookAndFeelV3,
    suggestion: true,
  });

  return (
    <SearchboxSubmitIcon
      handleSubmitIconClick={handleSubmitIconClick}
      cssClasses={searchboxSubmitIconClasses}
      telemetry={{
        name: 'search-engine',
        engine: 'cliqz',
        view: telemetryView,
        category: null,
        session,
      }}
    />
  );
};
