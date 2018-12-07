import React from 'react';
import PropTypes from 'prop-types';

function Pane({ children }) {
  return (
    <div>
      {children}
    </div>
  );
}

/* eslint-disable react/no-unused-prop-types */
Pane.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
};

export default Pane;
