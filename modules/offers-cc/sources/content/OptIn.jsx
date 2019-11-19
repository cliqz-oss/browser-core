import React from 'react';
import { css, i18n } from './common/utils';

const _css = css('opt-in__');
export default function OptIn(props) {
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div className={_css('image')} />
      <div className={_css('text-wrapper')}>
        <div className={_css('title')}>{i18n('optin_title')}</div>
        <div className={_css('description')}>{i18n('optin_description')}</div>
        <div style={{ height: '28px' }} />
        <div className={_css('buttons')}>
          <div
            onClick={() => props.onClick('no')}
            className={_css('button', 'button-no')}
          >
            {i18n('no')}
          </div>
          <div
            onClick={() => props.onClick('yes')}
            className={_css('button', 'button-yes')}
          >
            {i18n('yes')}
          </div>
        </div>
        <div style={{ height: '14px' }} />
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
