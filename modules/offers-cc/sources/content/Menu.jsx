import React from 'react';
import { css, i18n } from './common/utils';

const _css = css('menu__');
export default function Menu(props) {
  const { products = {} } = props;
  /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
  return (
    <ul className={_css('container')}>
      <li
        onClick={() => props.onClick('why-do-i-see')}
        className={_css('item')}
      >
        {i18n('why_see_this')}
      </li>
      {!(products.cliqz || products.amo || products.ghostery) && (
      <li
        onClick={() => props.onClick('settings')}
        className={_css('item')}
      >
        {i18n('settings')}
      </li>
      )}
      {!products.ghostery && (
      <li
        onClick={() => props.onClick('help')}
        className={_css('item')}
      >
        {i18n('help')}
      </li>
      )}
    </ul>
  );
  /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
}
