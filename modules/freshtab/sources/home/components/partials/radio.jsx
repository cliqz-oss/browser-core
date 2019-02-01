import React from 'react';
import PropTypes from 'prop-types';

function Radio({
  id,
  labelValue,
  name,
  onChange,
  value,
}) {
  return (
    <div>
      <input
        id={id}
        name={name}
        onChange={onChange}
        type="radio"
        value={value}
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
