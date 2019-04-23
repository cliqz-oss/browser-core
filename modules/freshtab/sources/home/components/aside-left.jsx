import React from 'react';
import PropTypes from 'prop-types';

import AsideElement from './partials/aside-element';
import t from '../i18n';

function AsideLeft({
  historyUrl,
  isHistoryEnabled,
  newTabUrl,
  onHistoryClick,
}) {
  return (
    <aside className="aside">
      <AsideElement
        condition={isHistoryEnabled}
        href={newTabUrl}
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
  newTabUrl: PropTypes.string,
  onHistoryClick: PropTypes.func,
};

export default AsideLeft;
