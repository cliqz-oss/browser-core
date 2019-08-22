/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
