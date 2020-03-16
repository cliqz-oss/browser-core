import React from 'react';
import send from '../transport';
import { css, i18n, chooseProduct } from '../utils';

const _css = css('onboarding__');
export default function Onboarding(props) {
  const product = chooseProduct(props.products);
  /* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/accessible-emoji */
  return (
    <div className={_css('container')}>
      <div className={_css('title')}>{i18n('onboarding_title')}&nbsp;&#128075;</div>
      <div className={_css('text')}>
        {i18n('onboarding_description', props.products.chip ? 'CHIP Sparalarm' : 'MyOffrz')}
      </div>
      <div
        className={_css('button', `${product}-button`)}
        onClick={() => {
          props.onHide();
          const url = props.products.chip
            ? 'http://sparalarm.chip.de/onboarding/#step-2'
            : 'https://myoffrz.com/on-boarding/';
          send('onboardingSeen', { interested: true });
          send('openURL', { url, closePopup: false });
        }}
      >
        {i18n('onboarding_cta')}
      </div>
      <div
        onClick={() => {
          props.onHide();
          send('onboardingSeen', { interested: false });
        }}
        className={_css('no-thanks')}
      >
        {i18n('onboarding_cancel')}
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions, jsx-a11y/accessible-emoji */
}
