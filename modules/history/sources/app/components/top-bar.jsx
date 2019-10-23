import React from 'react';
import PropTypes from 'prop-types';

import t from '../../i18n';

const TopBar = ({
  clearHistorySearch,
  handleSearchInputChange,
  inputValue = '',
  showHistoryDeletionPopup,
}) => {
  const getSearchClass = () => (inputValue.length !== 0 ? 'active-search' : '');

  return (
    <div className="history-top-bar">
      <div className={`search-wrap ${getSearchClass()}`}>
        <div className="search-icon" />
        <input
          className="search"
          onChange={handleSearchInputChange}
          placeholder={t('search_placeholder')}
          value={inputValue}
        />
        <button
          className="close-search"
          onClick={clearHistorySearch}
          type="button"
        />
      </div>

      <button
        className="clear-history-btn"
        onClick={showHistoryDeletionPopup}
        type="button"
      >
        {t('clear-btn-label')}
      </button>
    </div>
  );
};

TopBar.propTypes = {
  clearHistorySearch: PropTypes.func.isRequired,
  handleSearchInputChange: PropTypes.func.isRequired,
  inputValue: PropTypes.string,
  showHistoryDeletionPopup: PropTypes.func.isRequired,
};

export default TopBar;
