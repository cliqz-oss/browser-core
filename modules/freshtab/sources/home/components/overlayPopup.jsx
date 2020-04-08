/* eslint-disable react/no-danger */
/* eslint-disable react/button-has-type */
/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../i18n';

const geti18NHTML = (key, params) => ({ __html: t(key, params) });

const OverlayPopup = ({ handleClick }) => (
  <div className="overlayPopup">
    <div className="popup cliqz">
      <div className="logo" />
      <div className="center">
        <h1>{t('humanweb_consent_heading')}</h1>
        <div className="content">
          <div className="description">
            <span dangerouslySetInnerHTML={geti18NHTML('humanweb_consent_description')} />
          </div>
        </div>
        <div className="actions">
          <button onClick={() => handleClick(true)} className="button" dangerouslySetInnerHTML={geti18NHTML('humanweb_consent_accept_btn')} />
          <button onClick={() => handleClick(false)} className="button" dangerouslySetInnerHTML={geti18NHTML('humanweb_consent_deny_btn')} />
        </div>
      </div>
    </div>
  </div>
);

export default OverlayPopup;
