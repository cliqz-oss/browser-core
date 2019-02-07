import React from 'react';
import ReactModal from 'react-modal';
import PropTypes from 'prop-types';

function Modal({
  children,
  className,
  closeAction,
  showModal,
}) {
  return (
    <div>
      <ReactModal
        className={className}
        contentLabel="custom"
        isOpen={showModal}
        onRequestClose={closeAction}
        overlayClassName="overlay"
        shouldCloseOnOverlayClick
      >
        {children}
      </ReactModal>
    </div>
  );
}

Modal.propTypes = {
  className: PropTypes.string,
  closeAction: PropTypes.func,
  showModal: PropTypes.bool,
};

export default Modal;
