/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function RadioInput({
  isRadioChecked,
  onRadioUpdate,
}) {
  return (
    <input
      checked={isRadioChecked}
      onChange={onRadioUpdate}
      type="radio"
    />
  );
}

RadioInput.propTypes = {
  isRadioChecked: PropTypes.bool.isRequired,
  onRadioUpdate: PropTypes.func.isRequired,
};

export default RadioInput;
