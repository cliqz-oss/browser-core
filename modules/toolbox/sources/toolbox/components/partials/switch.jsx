/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function Switch({
  isChecked,
  toggleComponent
}) {
  return (
    <input
      checked={isChecked}
      className="switch"
      onChange={toggleComponent}
      type="checkbox"
    />
  );
}

Switch.propTypes = {
  isChecked: PropTypes.bool,
  toggleComponent: PropTypes.func.isRequired,
};
Switch.defaultProps = {
  isChecked: false,
};

export default Switch;
