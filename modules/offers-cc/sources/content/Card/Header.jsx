import React from 'react';
import send from '../transport';
import { css, i18n } from '../common/utils';

const _css = css('card-header__');
export default function Header(props) {
  const { voucher = {}, autoTrigger } = props;
  const { template_data: templateData, offer_id: offerId } = voucher;
  const {
    call_to_action: { url } = {},
    logo_dataurl: logoDataurl,
  } = templateData;

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
          style={{ backgroundImage: `url(${logoDataurl})` }}
          className={_css('image')}
        />
      </div>
      <div className={_css('right-item')}>
        <span className={_css('affiliate-link')}>
          {i18n('affiliate_link')}
        </span>
        {!autoTrigger && (
          <div
            onClick={props.onRemove}
            className={_css('trash')}
          />
        )}
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
