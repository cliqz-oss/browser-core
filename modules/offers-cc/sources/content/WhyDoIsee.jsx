import React from 'react';
import { chrome } from '../../platform/content/globals';
import send from './transport';
import { css, i18n } from './common/utils';

const _css = css('why-do-i-see__');
export default function WhyDoIsee(props) {
  const { products, onClose } = props;
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
        <h2 className={_css('title', products.chip ? 'chip-title' : 'myoffrz-title')}>
          {i18n('why_see_these_offers')}
        </h2>
        <p className={_css('description')}>{i18n('why_offers_text')}</p>
        <span
          onClick={() => {
            send('sendTelemetry', { target: 'learn_more' });
            const prefix = chrome.i18n.getUILanguage() !== 'de' ? 'en/' : '';
            send('openURL', {
              url: products.cliqz
                ? `https://cliqz.com/${prefix}myoffrz`
                : `https://myoffrz.com/${prefix}fuer-nutzer`,
              closePopup: false,
            });
          }}
          className={_css('link')}
          href="https://myoffrz.com/fuer-nutzer"
          target="_blank"
          rel="noopener noreferrer"
        >
          {i18n('learn_more')}
        </span>
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
