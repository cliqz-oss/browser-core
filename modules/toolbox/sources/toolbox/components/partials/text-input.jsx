/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

import GenericInput from './generic-input';

function TextInput({
  onTextChange,
  placeholder,
  textInputValue,
}) {
  return (
    <GenericInput
      inputType="text"
      onInputChange={onTextChange}
      placeholder={placeholder || 'String'}
      textInputValue={textInputValue}
    />
  );
}

TextInput.propTypes = {
  onTextChange: PropTypes.func,
  placeholder: PropTypes.string,
  textInputValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
};

TextInput.defaultProps = {
  textInputValue: '',
};

export default TextInput;
