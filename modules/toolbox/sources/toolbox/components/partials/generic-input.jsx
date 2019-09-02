/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function GenericInput({
  inputType,
  minValue,
  onInputChange,
  placeholder,
  textInputValue,
}) {
  const onChange = (event) => {
    const value = event.target.value;
    onInputChange(value);
  };

  return (
    <input
      className="textinput"
      min={minValue}
      onChange={onChange}
      placeholder={placeholder}
      type={inputType}
      value={textInputValue}
    />
  );
}

GenericInput.propTypes = {
  inputType: PropTypes.string.isRequired,
  minValue: PropTypes.number,
  onInputChange: PropTypes.func,
  placeholder: PropTypes.string,
  textInputValue: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
};

export default GenericInput;
