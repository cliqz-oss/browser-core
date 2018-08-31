import React from 'react';
import ReactModal from 'react-modal';

function Modal(props) {
  return (
    <div>
      <ReactModal
        isOpen={props.showModal}
        contentLabel="custom"
        shouldCloseOnOverlayClick
        onRequestClose={props.closeAction}
        className="modal"
        overlayClassName="overlay"
      >
        {props.children}
      </ReactModal>
    </div>
  );
}

export default Modal;
