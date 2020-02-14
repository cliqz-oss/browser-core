import React from 'react';
import send from './transport';
import { css, i18n } from './common/utils';

const _css = css('survey__');
export default function (props) {
  const { domain, back } = props;
  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/accessible-emoji */
  return (
    <div className={_css('content')}>
      <div style={{ height: '10px' }} />
      <div className={_css('header')}>
        <div className={_css('title')}>{i18n('did_it_work')}&nbsp;🧐</div>
        <div
          onClick={() => {
            send('checkoutsAction', { action: 'close', domain });
            send('hideBanner');
          }}
          className={_css('close')}
        />
      </div>
      <div style={{ height: '10px' }} />
      <div className={_css('description')}> {i18n('was_redeemed_ok')} </div>
      <div style={{ height: '15px' }} />
      <div className={_css('buttons')}>
        <div
          onClick={() => {
            send('checkoutsAction', { action: 'ok', domain });
            send('log', { action: 'coupon_autofill_field_success_use', back });
            props.onClick('success');
          }}
          className={_css('button')}
        >
          {i18n('yes')}
        </div>
        <div
          onClick={() => {
            send('checkoutsAction', { action: 'fail', domain });
            send('log', { action: 'coupon_autofill_field_error_use', back });
            props.onClick('reason');
          }}
          className={_css('button')}
        >
          {i18n('no')}
        </div>
      </div>
      <div style={{ height: '10px' }} />
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/accessible-emoji */
}
