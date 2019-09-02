/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

export default function Switch({
  isChecked,
  name,
  toggleComponent,
}) {
  return (
    <label className="switch">
      <input
        checked={isChecked}
        className="toggle"
        name={name}
        onChange={toggleComponent}
        tabIndex="-1"
        type="checkbox"
      />
      <span className="slider" />
    </label>
  );
}

Switch.propTypes = {
  isChecked: PropTypes.bool,
  name: PropTypes.string,
  toggleComponent: PropTypes.func,
};
Switch.defaultProps = {
  isChecked: false,
};
