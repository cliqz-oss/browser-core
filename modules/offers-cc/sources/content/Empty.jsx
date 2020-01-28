import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct } from './common/utils';

const _css = css('empty__');
function Header(props) {
  /* eslint-disable jsx-a11y/accessible-emoji */
  return (
    <div className={_css('title', `${props.prefix}-title`)}>
      {i18n('welcome_title')}&nbsp;&#128075;
    </div>
  );
  /* eslint-enable jsx-a11y/accessible-emoji */
}

export default function Empty(props) {
  const { products } = props;
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
  const prefix = chooseProduct(products);
  const url = prefix === 'chip'
    ? 'https://sparalarm.chip.de/onboarding/'
    : 'https://myoffrz.com/on-boarding/';
  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        <Header prefix={prefix} />
        <p className={_css('text')}>{i18n('welcome_text')}</p>
        <div style={{ height: '12px' }} />
        <div
          onClick={() => {
            send('openURL', { url });
            if (props.autoTrigger) {
              send('hideBanner');
            } else {
              window.close();
            }
          }}
          className={_css('button', `${prefix}-button`)}
        >
          {i18n('onboarding_cta')}
        </div>
        <div style={{ height: '10px' }} />
      </div>
    </div>
  );
  /* eslint-enable  jsx-a11y/no-static-element-interactions */
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
}
