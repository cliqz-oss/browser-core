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
