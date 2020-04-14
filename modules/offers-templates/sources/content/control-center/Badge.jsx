import React from 'react';
import Picture from '../widgets/Picture';
import { css, chooseProduct } from '../utils';

const _css = css('badge__');
export default function Badge(props) {
  const { voucher = {}, notification = '', products, autoTrigger } = props;
  const { template_data: templateData = {} } = voucher;
  const {
    logo_class: logoClass,
    logo_url: logoUrl,
  } = templateData;
  const product = chooseProduct(products);
  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
  const shouldShowNotification = autoTrigger && (products.chip || products.myoffrz);

  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        <div className={_css('left-item')}>
          {shouldShowNotification && (
            <div className={_css('notification', `${product}-notification`)}>
              {notification}
            </div>
          )}
          <Picture
            url={logoUrl}
            dataurl={props.logoDataurl}
            onLoadImage={props.onLoadLogo}
            height="34px"
            width={sizesByClass[logoClass] || '83px'}
          />
        </div>
        <div className={_css('middle-item')} />
        <div className={_css('right-item')}>
          {templateData.benefit && (
            <div className={_css('title')}>{templateData.benefit}</div>
          )}
          <div
            style={{ width: shouldShowNotification ? 120 : 147 }}
            className={_css('description')}
          >
            {templateData.headline}
          </div>
        </div>
      </div>
      <div style={{ height: '8px' }} />
    </div>
  );
}
