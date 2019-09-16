import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct, getUILanguage } from './common/utils';

const _css = css('footer__');
export default function Footer(props) {
  const { products } = props;
  const lang = getUILanguage() !== 'de' ? 'en/' : '';
  const prefix = chooseProduct(products, { cliqz: true });
  const feedbackURL = prefix === 'chip'
    ? 'https://sparalarm.chip.de/feedback/'
    : `https://myoffrz.com/${lang}feedback/?p=${prefix}`;

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div
        className={_css('left-item')}
        onClick={() => {
          send('openURL', { url: feedbackURL, closePopup: false });
          send('sendTelemetry', { target: 'general_feedback' });
        }}
      >
        <div className={_css('face')} />
        <div className={_css('space')} />
        <div className={_css('feedback')}>{i18n('offers_hub_feedback_title')}</div>
      </div>
      <div className={_css('right-item')}>
        <span
          title={i18n('offers_hub_powered_by_offrz')}
          className={_css('logo', `${prefix}-logo`)}
          onClick={() => {
            send('openURL', {
              url: (products.cliqz && `https://cliqz.com/${lang}myoffrz`)
                   || (products.chip && 'https://sparalarm.chip.de/fuer-nutzer')
                   || `https://myoffrz.com/${lang}fuer-nutzer`,
              closePopup: false,
            });
            send('sendTelemetry', { target: 'product_logo' });
          }}
        />
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
