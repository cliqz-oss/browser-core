import React from 'react';
import t from '../../i18n';

export default function Welcome({
  visible,
}) {
  return (
    <div
      className={`step welcome ${visible ? 'show' : ''}`}
    >
      <div className="welcome-text">
        {t('welcome')}
      </div>
    </div>
  );
}
