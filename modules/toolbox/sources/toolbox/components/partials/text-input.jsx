import React from 'react';
import PropTypes from 'prop-types';

function TextInput({
  onTextChange,
  textInputValue,
}) {
  const onTextInputChange = (event) => {
    const value = event.target.value;
    onTextChange(value);
  };

  return (
    <input
      className="textinput"
      onChange={onTextInputChange}
      type="text"
      value={textInputValue}
    />
  );
}

TextInput.propTypes = {
  onTextChange: PropTypes.func,
  textInputValue: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
};

export default TextInput;
