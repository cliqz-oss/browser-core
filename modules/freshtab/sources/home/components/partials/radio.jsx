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
      <label htmlFor={id}>
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
