import React from 'react';
import send from '../transport';
import { css, i18n } from '../utils';

const _css = css('thank-you__');
export default function () {
  const url = 'https://sparalarm.chip.de/kontakt/';
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('content')}>
      <div style={{ height: '10px' }} />
      <div className={_css('header')}>
        <div className={_css('title')}>
          {i18n('thank_you')}&nbsp;
          <div className={_css('emoji')} />
        </div>
        <div
          onClick={() => send('hideBanner')}
          className={_css('close')}
        />
      </div>
      <div style={{ height: '10px' }} />
      <div className={_css('subtitle')}>
        {i18n('feedback_goto')}
      </div>
      <div style={{ height: '4px' }} />
      <div
        onClick={() => send('openURL', { url, closePopup: false })}
        className={_css('link')}
      >
        https://sparalarm.chip.de/kontakt/
      </div>
      <div style={{ height: '10px' }} />
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
