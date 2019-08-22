/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function Radio({
  checked,
  id,
  labelValue,
  name,
  onChange,
  value,
}) {
  return (
    <div>
      <input
        tabIndex="-1"
        id={id}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
        defaultChecked={checked}
      />
      <label className="input-label" htmlFor={id}>
        {labelValue}
      </label>
    </div>
  );
}
Radio.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default Radio;
