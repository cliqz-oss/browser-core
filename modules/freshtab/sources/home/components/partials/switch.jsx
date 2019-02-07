import React from 'react';
import PropTypes from 'prop-types';

export default function Switch({
  isChecked,
  name,
  toggleComponent,
}) {
  return (
    <div className="switch-container">
      <label>
        <input
          checked={isChecked}
          className="switch"
          name={name}
          onChange={toggleComponent}
          tabIndex="-1"
          type="checkbox"
        />
        <div>
          <span className="icon icon-toolbar grid-view" />
          <span className="icon icon-toolbar ticket-view" />
          <div />
        </div>
      </label>
    </div>
  );
}

Switch.propTypes = {
  isChecked: PropTypes.bool,
  name: PropTypes.string,
  toggleComponent: PropTypes.func,
};
Switch.defaultProps = {
  isChecked: false,
};
