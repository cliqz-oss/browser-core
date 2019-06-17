import React from 'react';
import send from './transport';
import { css } from './common/utils';

const _css = css('header__');
export default function Header(props) {
  const { products, onClickMenu, activeMenu, autoTrigger } = props;
  const labels = [
    ['cliqz', 'Cliqz Offers'],
    ['chip', ''],
  ];
  const defaultLabel = ['myoffrz', 'MyOffrz'];
  const label = labels.find(([product]) => products[product]) || defaultLabel;
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div className={_css('left-item')}>
        <div className={_css(products.chip ? 'chip-logo' : 'myoffrz-logo')} />
        <div className={_css('space')} />
        <div className={_css('label')}>{label[1]}</div>
      </div>
      <div className={_css('right-item')}>
        <div
          onClick={onClickMenu}
          className={_css('menu', activeMenu ? 'menu-active' : '')}
        />
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
