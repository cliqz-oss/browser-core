import React from 'react';
import t from '../services/i18n';

export default ({ results = [], cssClasses = '' }) => {
  if (results.length > 0) {
    return (
      <div
        className={cssClasses}
      >
        {t('safe_search_from_cliqz')}
      </div>
    );
  }

  return null;
};
