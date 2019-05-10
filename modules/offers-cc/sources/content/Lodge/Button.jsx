import React from 'react';
import send from '../transport';
import { css } from '../common/utils';

const _css = css('lodge-button__');
export default function (props) {
  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  const { template_data: templateData = {}, offer_id: offerId } = props.voucher || {};
  const { call_to_action: { text, url } = {} } = templateData;
  return (
    <div className={_css('container')}>
      <div
        onClick={() => {
          send('openURL', {
            offerId,
            url,
            closePopup: false,
            isCallToAction: true,
          });
          send('sendTelemetry', { target: 'use' });
        }}
        className={_css('cta-button')}
      >
        {text}
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
