import React from 'react';
import send from '../transport';
import Promo from './Promo';
import Conditions from './Conditions';
import { css } from '../utils';

const _css = css('content__');
export default function Content(props) {
  const { voucher, domain, canInject, products, back } = props;
  const { logo, logoClass, benefit, headline } = voucher;
  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };

  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  return (
    <React.Fragment>
      <div className={_css('header')}>
        <div
          style={{
            backgroundImage: `url(${logo})`,
            width: sizesByClass[logoClass] || '70px',
          }}
          className={_css('logo')}
        />
        <div
          onClick={() => {
            send('checkoutsAction', { action: 'close', domain });
            send('log', { action: 'coupon_autofill_field_x_action', back });
            send('hideBanner');
          }}
          className={_css('close')}
        />
      </div>
      <div style={{ height: '15px' }} />
      <div className={_css('content')}>
        <div style={{ height: '12px' }} />
        <div className={_css('benefit')}>{benefit}</div>
        <div className={_css('headline')}>{headline}</div>
        <div style={{ height: '18px' }} />
        {voucher.conditions && <Conditions voucher={voucher} />}
        <div style={{ height: '27px' }} />
        <div className={_css('promo-wrapper')}>
          {voucher.code && (
            <Promo
              products={products}
              onClick={props.onClick}
              voucher={voucher}
              canInject={canInject}
              domain={domain}
            />
          )}
        </div>
        <div style={{ height: '2px' }} />
      </div>
      <div style={{ height: '15px' }} />
    </React.Fragment>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
