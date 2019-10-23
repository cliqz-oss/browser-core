/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

import AsideElement from './partials/aside-element';
import t from '../i18n';

function AsideLeft({
  historyUrl,
  isHistoryEnabled,
  onHistoryClick,
}) {
  return (
    <aside className="aside">
      <AsideElement
        condition={isHistoryEnabled}
        href="#"
        id="cliqz-home"
        label="Home"
        title={t('cliqz_tab_button')}
      />

      <AsideElement
        condition={isHistoryEnabled}
        href={historyUrl}
        id="cliqz-history"
        onClick={onHistoryClick}
        label="History"
        title={t('history_button')}
      />
    </aside>
  );
}

AsideLeft.propTypes = {
  historyUrl: PropTypes.string,
  isHistoryEnabled: PropTypes.bool,
  onHistoryClick: PropTypes.func,
};

export default AsideLeft;
