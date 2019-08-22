/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default (props = {}) => {
  const handleSubmitIconClick = typeof props.handleSubmitIconClick === 'function'
    ? props.handleSubmitIconClick
    : () => {};

  const cssClasses = props.cssClasses || [];

  const telemetry = props.telemetry || {};

  return (
    <a
      onClick={handleSubmitIconClick}
      href="/"
      className={['searchbox-submit-icon'].concat(cssClasses).join(' ')}
      data-telemetry={telemetry.name}
      data-engine={telemetry.engine}
      data-view={telemetry.view}
      data-category={telemetry.category}
      data-session={telemetry.session}
    >
      Search
    </a>
  );
};
