import React from 'react';
import PropTypes from 'prop-types';

function Endpoint({
  isRadioChecked,
  label,
  onRadioUpdate,
}) {
  return (
    <td>
      <label htmlFor={label.name}>
        <input
          type="radio"
          id={label.name}
          name="endpoint"
          checked={isRadioChecked}
          onChange={onRadioUpdate}
        />
        {label.name}
      </label>
    </td>
  );
}

Endpoint.propTypes = {
  label: PropTypes.object.isRequired,
  isRadioChecked: PropTypes.bool.isRequired,
  onRadioUpdate: PropTypes.func.isRequired,
};

export default Endpoint;
