import React from 'react';
import PropTypes from 'prop-types';

const ModalHeader = ({ title }) => (
  <div className="modal-header">
    {title}
  </div>
);

export default ModalHeader;

ModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
};
