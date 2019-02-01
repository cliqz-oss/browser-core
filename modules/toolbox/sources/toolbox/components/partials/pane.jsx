import React from 'react';
import PropTypes from 'prop-types';

function Pane({ children }) {
  return (
    <div className="modal-group">
      {children}
    </div>
  );
}

/* eslint-disable react/no-unused-prop-types */
Pane.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.element
  ]).isRequired,
  label: PropTypes.string.isRequired,
};

export default Pane;
