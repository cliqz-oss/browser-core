/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable jsx-a11y/no-autofocus */
import React from 'react';
import PropTypes from 'prop-types';

function TextInput({
  autoFocus,
  className,
  disabled,
  id,
  labelClassName,
  labelValue,
  name,
  onChange,
  placeholder,
  value,
}) {
  return (
    <div className="field">
      <input
        autoFocus={autoFocus}
        className={className}
        disabled={disabled}
        id={id}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      <label
        className={labelClassName}
        htmlFor={id}
      >
        {labelValue}
      </label>
    </div>
  );
}
TextInput.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default TextInput;
