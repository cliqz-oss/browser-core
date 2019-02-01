import React from 'react';
import PropTypes from 'prop-types';
import ModalHeader from './modal-header';

function ModalCell({
  children,
  modalClass,
  modalHeader,
}) {
  return (
    <div className={`modal-item ${modalClass}`}>
      <ModalHeader
        title={modalHeader}
      />

      {children}
    </div>
  );
}

ModalCell.propTypes = {
  modalClass: PropTypes.string,
  modalHeader: PropTypes.string,
};

ModalCell.defaultProps = {
  modalClass: '',
  modalHeader: '',
};

export default ModalCell;
