import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct, getUILanguage } from './common/utils';

const _css = css('empty__');
function Header(props) {
  /* eslint-disable jsx-a11y/accessible-emoji */
  return (
    <div className={_css('title', `${props.product}-title`)}>
      {i18n('welcome_title')}&nbsp;&#128075;
    </div>
  );
  /* eslint-enable jsx-a11y/accessible-emoji */
}

export default function Empty(props) {
  const { products } = props;
  const product = chooseProduct(products);
  const lang = getUILanguage() !== 'de' ? 'en/' : '';
  const url = {
    chip: 'https://sparalarm.chip.de/onboarding/',
    cliqz: `https://cliqz.com/${lang}myoffrz`,
    amo: `https://cliqz.com/${lang}myoffrz`,
  }[product] || 'https://myoffrz.com/on-boarding/';

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        <Header product={product} />
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
          className={_css('button', `${product}-button`)}
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
