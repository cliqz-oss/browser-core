import React from 'react';
import Picture from '../widgets/Picture';
import { css } from '../utils';

const _css = css('badge__');
export default function Badge(props) {
  const { voucher = {}, notification = '' } = props;
  const { template_data: templateData = {} } = voucher;
  const {
    logo_class: logoClass,
    logo_url: logoUrl,
  } = templateData;
  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };

  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        <div className={_css('left-item')}>
          <Picture
            url={logoUrl}
            dataurl={props.logoDataurl}
            onLoadImage={props.onLoadLogo}
            height="34px"
            width={sizesByClass[logoClass] || '83px'}
            notification={notification}
          />
        </div>
        <div className={_css('middle-item')} />
        <div className={_css('right-item')}>
          <div className={_css('title')}>{templateData.benefit}</div>
          <div className={_css('description')}>{templateData.headline}</div>
        </div>
      </div>
      <div style={{ height: '8px' }} />
    </div>
  );
}
