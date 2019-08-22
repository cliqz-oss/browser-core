/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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

ReactModal.setAppElement('#root');

Modal.propTypes = {
  className: PropTypes.string,
  closeAction: PropTypes.func,
  showModal: PropTypes.bool,
};

export default Modal;
