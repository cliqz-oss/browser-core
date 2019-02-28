import React from 'react';
import PropTypes from 'prop-types';

import AsideElement from './partials/aside-element';
import t from '../i18n';

function AsideLeft({
  cliqzForFriends,
  displayFriendsIcon,
  historyUrl,
  isHistoryEnabled,
  newTabUrl,
  onFriendsClick,
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
      <AsideElement
        condition={displayFriendsIcon}
        href={cliqzForFriends}
        id="cliqz-for-friends"
        onClick={onFriendsClick}
        label="Cliqz for Friends"
        title={t('cliqz_for_friends_button')}
      />
    </aside>
  );
}

AsideLeft.propTypes = {
  cliqzForFriends: PropTypes.string,
  displayFriendsIcon: PropTypes.bool,
  historyUrl: PropTypes.string,
  isHistoryEnabled: PropTypes.bool,
  newTabUrl: PropTypes.string,
  onFriendsClick: PropTypes.func,
  onHistoryClick: PropTypes.func,
};

export default AsideLeft;
