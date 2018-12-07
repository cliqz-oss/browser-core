import React from 'react';
import PropTypes from 'prop-types';

function Custom({
  isRadioChecked,
  onRadioUpdate,
  onTextChange,
  textInputValue,
}) {
  const onTextInputChange = (event) => {
    const value = event.target.value;
    onTextChange(value);
  };

  return (
    <tr>
      <td>
        <label htmlFor="custom">
          <input
            type="radio"
            id="custom"
            name="endpoint"
            checked={isRadioChecked}
            onChange={() => onRadioUpdate(textInputValue)}
          />
          custom
        </label>
      </td>
      <td>
        <input
          className="textinput"
          type="text"
          name="endpoint"
          value={textInputValue}
          onChange={onTextInputChange}
        />
      </td>
    </tr>
  );
}

Custom.propTypes = {
  isRadioChecked: PropTypes.bool.isRequired,
  onRadioUpdate: PropTypes.func.isRequired,
  onTextChange: PropTypes.func.isRequired,
  textInputValue: PropTypes.string.isRequired,
};

export default Custom;
