import React from 'react';
import send from '../transport';
import { css } from '../common/utils';

const _css = css('lodge-header__');
export default function Header(props) {
  const { voucher = {}, autoTrigger } = props;
  const { template_data: templateData = {}, offer_id: offerId } = voucher;
  const { call_to_action: { url } = {} } = templateData;
  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div className={_css('left-item')}>
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
          style={{
            backgroundImage: `url(${templateData.logo_dataurl})`,
            width: sizesByClass[templateData.logo_class] || '70px',
          }}
          className={_css('image')}
        />
      </div>
      <div className={_css('right-item')}>
        <div
          onClick={() => {
            send('sendTelemetry', { target: 'close' });
            if (autoTrigger) {
              send('hideBanner');
            } else {
              window.close();
            }
          }}
          className={_css('close')}
        />
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
