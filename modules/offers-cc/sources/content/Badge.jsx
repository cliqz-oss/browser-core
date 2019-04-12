import React from 'react';
import { css } from './common/utils';

const _css = css('badge__');
export default function Badge(props) {
  const { voucher, wrapperClass } = props;
  const { template_data: templateData = {} } = voucher;
  return (
    <div className={[_css('wrapper'), wrapperClass].join(' ')}>
      <div className={_css('container')}>
        <div className={_css('left-item')}>
          <div className={_css('title')}>{templateData.benefit}</div>
          <div className={_css('description')}>{templateData.headline}</div>
        </div>
        <div style={{ width: '10px' }} />
        <div className={_css('right-item')}>
          <div
            style={{ backgroundImage: `url(${templateData.logo_dataurl})` }}
            className={_css('image')}
          />
        </div>
      </div>
      <div style={{ height: '6px' }} />
    </div>
  );
}
