import React from 'react';
import send from '../transport';
import { css, i18n } from '../common/utils';

const _css = css('card-header__');
export default function Header(props) {
  const { voucher = {}, autoTrigger } = props;
  const { template_data: templateData, offer_id: offerId } = voucher;
  const { call_to_action: { url } = {} } = templateData;
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div className={_css('left-item')}>
        {(templateData.labels || []).map(label => (
          <React.Fragment key={label}>
            <div key={label} className={_css(label, 'label')}>{i18n(`offers_${label}`)}</div>
            <div key={`${label}vspace`} style={{ height: '2px' }} />
          </React.Fragment>
        ))}
      </div>
      <div className={_css('right-item')}>
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
          style={{ backgroundImage: `url(${templateData.logo_dataurl})` }}
          className={_css('image')}
        />
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
