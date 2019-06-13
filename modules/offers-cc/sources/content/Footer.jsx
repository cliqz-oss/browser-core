import React from 'react';
import { chrome } from '../../platform/content/globals';
import send from './transport';
import { css, i18n } from './common/utils';

const _css = css('footer__');
export default function Footer(props) {
  const { products } = props;
  const prefix = ['cliqz', 'chip'].find(product => products[product]) || 'myoffrz';
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div className={_css('container')}>
      <div
        className={_css('left-item')}
        onClick={() => {
          const lang = chrome.i18n.getUILanguage() !== 'de' ? 'en/' : '';
          send('openURL', {
            url: `https://myoffrz.com/${lang}feedback/?p=${prefix}`,
            closePopup: false,
          });
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
            const lang = chrome.i18n.getUILanguage() !== 'de' ? 'en/' : '';
            send('openURL', {
              url: products.cliqz
                ? `https://cliqz.com/${lang}myoffrz`
                : `https://myoffrz.com/${lang}fuer-nutzer`,
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
