import React from 'react';
import { css } from '../common/utils';

/* eslint-disable  jsx-a11y/no-static-element-interactions */
const _css = css('lodge-conditions__');
export default function (props) {
  const { voucher = {} } = props;
  const { template_data: templateData = {} } = voucher;
  return (
    <div className={_css('wrapper')}>
      <div style={{ height: '18px' }} />
      <div className={_css('benefit')}>
        {templateData.benefit}
      </div>
      <div style={{ height: '12px' }} />
      <div
        className={_css('conditions')}
      >
        {templateData.conditions}
      </div>
      <div style={{ height: '10px' }} />
    </div>
  );
}
