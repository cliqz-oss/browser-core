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
  function getClassName() {
    const infoBlockClass = visible ? 'info-block' : 'info-block-hidden';
    return `${infoBlockClass} import-data`;
  }

  return (
    <div className={getClassName()}>
      <div className="info-block-content">
        <div className="info-headline import-data-headline">
          <p>{t('import_data_description_1')}</p>
          <p>{t('import_data_description_2')}</p>
        </div>
      </div>
      <div className="info-block-ctrl">
        <button
          type="button"
          className="import-data-ctrl-content"
          onClick={onClick}
        >
          {t('import_data_button')}
        </button>
      </div>
    </div>
  );
}
