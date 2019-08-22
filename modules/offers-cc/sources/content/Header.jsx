import React from 'react';
import send from './transport';
import { css, chooseProduct } from './common/utils';

const _css = css('header__');
export default class Header extends React.Component {
  onClickClose = () => {
    const { autoTrigger, vouchers } = this.props;
    send('sendTelemetry', { target: 'close' });
    if (!autoTrigger) {
      window.close();
      return;
    }
    if (vouchers.length === 1) {
      /*
        if we decide to choose abtest as main view
        then TODO add `offer_closed` signal to abtest
      */
      send('sendOfferActionSignal', {
        signal_type: 'offer-action-signal',
        element_id: 'offer_closed',
        offer_id: vouchers[0].offer_id,
      });
    }
    send('hideBanner');
  }

  render() {
    const { products, onClickMenu, activeMenu } = this.props;
    const prefix = chooseProduct(products, { cliqz: true });
    const labels = { cliqz: 'Cliqz Offers', myoffrz: 'MyOffrz', chip: 'Sparalarm' };

    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('container')}>
        <div className={_css('left-item')}>
          <div className={_css(`${prefix}-logo`)} />
          <div className={_css('space')} />
          <div className={_css('label', `${prefix}-label`)}>{labels[prefix] || ''}</div>
        </div>
        <div className={_css('right-item')}>
          <div
            onClick={onClickMenu}
            className={_css('menu', activeMenu ? 'menu-active' : '')}
          />
          <div
            onClick={this.onClickClose}
            className={_css('close')}
          />
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
