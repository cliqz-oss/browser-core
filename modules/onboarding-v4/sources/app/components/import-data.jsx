/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default function ImportData({
  onClick,
  visible,
}) {
  return (
    <div className={`step import-data ${visible ? 'show' : ''}`}>
      {visible && (
        <React.Fragment>
          <div className="info">
            <div className="headline">
              <span>
                {t('import_data_headline')}
              </span>
            </div>

            <button
              type="button"
              className="import"
              onClick={onClick}
            >
              {t('import_data_button')}
            </button>

            <div className="description-area">
              <span className="description">
                {t('import_data_description')}
              </span>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
