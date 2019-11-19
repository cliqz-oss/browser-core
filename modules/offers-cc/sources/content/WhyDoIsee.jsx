import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct, getUILanguage } from './common/utils';

const _css = css('why-do-i-see__');
export default function WhyDoIsee(props) {
  const { products, onClose } = props;
  const prefix = chooseProduct(products);

  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        <div style={{ height: '15px' }} />
        <div
          onClick={onClose}
          className={_css('cross')}
        />
        <div style={{ height: '20px' }} />
        <h2 className={_css('title', `${prefix}-title`)}>
          {i18n('why_see_these_offers')}
        </h2>
        <p className={_css('description')}>{i18n('why_offers_text')}</p>
        <span
          onClick={() => {
            send('sendTelemetry', { target: 'learn_more' });
            const lang = getUILanguage() !== 'de' ? 'en/' : '';
            const ghosteryUrl = 'https://www.ghostery.com/faqs/what-is-ghostery-rewards/';
            send('openURL', {
              url: (products.cliqz && `https://cliqz.com/${lang}myoffrz`)
                   || (products.chip && 'https://sparalarm.chip.de/fuer-nutzer')
                   || (products.ghostery && ghosteryUrl)
                   || `https://myoffrz.com/${lang}fuer-nutzer`,
              closePopup: false,
            });
          }}
          className={_css('link')}
        >
          {i18n('learn_more')}
        </span>
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
