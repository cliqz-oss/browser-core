import React from 'react';
import { css, i18n } from './common/utils';

const _css = css('empty__');
function renderChipHeader() {
  return (
    <div className={_css('stars')}>
      <div style={{ height: '50px' }} />
      <h1 className={_css('title', 'chip-title')}>
        {i18n('offers_hub_welcome_title')}
      </h1>
    </div>
  );
}
function renderMyOffrzHeader() {
  return (
    <React.Fragment>
      <img
        className={_css('image')}
        src="./images/offers-cc-icon.svg"
        alt=""
      />
      <h1 className={_css('title', 'myoffrz-title')}>
        {i18n('offers_hub_welcome_title')}
      </h1>
    </React.Fragment>
  );
}

export default function Empty(props) {
  const { products } = props;
  return (
    <div className={_css('wrapper')}>
      <div className={_css('container')}>
        {products.chip ? renderChipHeader() : renderMyOffrzHeader() }
        <p className={_css('text')}>{i18n('offers_hub_welcome_text')}</p>
      </div>
    </div>
  );
}
