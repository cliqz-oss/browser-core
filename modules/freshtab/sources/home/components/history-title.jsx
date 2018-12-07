import React from 'react';
import t from '../i18n';

export default function HistoryTitle({ dials: { history, isLoaded } }) {
  let title = '&nbsp;';
  if (isLoaded) {
    title = history.length
      ? t('app_speed_dials_row_history')
      : t('app_speed_dials_row_history_onboarding');
  }
  return (
    <div className="dial-header">
      {title}
    </div>
  );
}
