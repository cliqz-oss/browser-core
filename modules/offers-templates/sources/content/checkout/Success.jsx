import React from 'react';
import send from '../transport';
import { css, i18n } from '../utils';

const _css = css('success__');
export default function () {
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div
        onClick={() => send('hideBanner')}
        className={_css('close')}
      />
      <div style={{ height: '47px' }} />
      <div className={_css('big-logo')} />
      <div className={_css('text')}>
        {i18n('congratulations')}<br />
        {i18n('enjoy_your_purchase')}
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
