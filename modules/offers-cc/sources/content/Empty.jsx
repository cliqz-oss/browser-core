import React from 'react';
import send from './transport';
import { css, i18n, chooseProduct } from './common/utils';

const _css = css('empty__');
function renderWhiteLabelHeader(prefix) {
  return (
    <div className={_css('stars')}>
      <div style={{ height: '50px' }} />
      <h1 className={_css('title', `${prefix}-title`)}>{i18n('welcome_title')}</h1>
    </div>
  );
}

function renderCliqzHeader(prefix) {
  return (
    <React.Fragment>
      <img
        className={_css('image')}
        src="./images/offers-cc-icon.svg"
        alt=""
      />
      <h1 className={_css('title', `${prefix}-title`)}>{i18n('welcome_title')}</h1>
    </React.Fragment>
  );
}

export default function Empty(props) {
  const { products } = props;
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
  const prefix = chooseProduct(products);
  const mapper = {
    amo: renderCliqzHeader,
    cliqz: renderCliqzHeader,
  };
  const url = prefix === 'chip'
    ? 'https://sparalarm.chip.de/onboarding/'
    : 'https://myoffrz.com/on-boarding/';
  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        {(mapper[prefix] || renderWhiteLabelHeader)(prefix)}
        <p className={_css('text')}>{i18n('welcome_text')}</p>
        <p
          onClick={() => {
            send('openURL', { url });
            if (props.autoTrigger) {
              send('hideBanner');
            } else {
              window.close();
            }
          }}
          className={_css('link')}
        >
          {i18n('welcome_link')}
        </p>
      </div>
    </div>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
}
