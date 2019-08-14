import React from 'react';
import Header from './Header';
import Promo from './Promo';
import { css, chooseProduct } from './common/utils';

const _css = css('content__');
export default function Content(props) {
  const { voucher, products, view, onChangeView } = props;
  const product = chooseProduct(products);
  return (
    <div className={_css('container-base', `${product}-container`)}>
      <Header
        voucher={voucher}
        view={view}
        onChangeView={onChangeView}
      />
      <div style={{ height: '10px' }} />
      <div className={_css('benefit')}>{voucher.benefit || ''}</div>
      <div style={{ height: '6px' }} />
      <div className={_css('description')}>{voucher.description || ''}</div>
      {voucher.code && <div style={{ height: '16px' }} />}
      {voucher.code && <Promo voucher={voucher} products={products} />}
    </div>
  );
}
