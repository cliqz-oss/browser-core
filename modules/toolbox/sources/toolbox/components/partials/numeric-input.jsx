import React from 'react';
import PropTypes from 'prop-types';

import GenericInput from './generic-input';

function NumericInput({
  minValue,
  onNumberChange,
  textInputValue,
}) {
  return (
    <GenericInput
      inputType="number"
      minValue={minValue}
      onInputChange={onNumberChange}
      placeholder="Number"
      textInputValue={textInputValue}
    />
  );
}

NumericInput.propTypes = {
  onNumberChange: PropTypes.func,
  textInputValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
};

export default NumericInput;
