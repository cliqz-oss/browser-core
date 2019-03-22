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
