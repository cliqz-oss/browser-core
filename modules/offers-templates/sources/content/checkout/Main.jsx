import React from 'react';
import Content from './Content';
import send from '../transport';
import { css, chooseProduct, i18n } from '../utils';

const TIMEOUT_FOR_NEXT_STEP = 2 * 1000;

const _css = css('main__');
export default class Main extends React.Component {
  state = {
    loading: false,
    injected: false,
    logoText: i18n('voucher_found'),
  }

  componentDidMount() {
    const { back } = this.props;
    send('log', { action: 'coupon_autofill_field_show', back });
  }

  onClickPromo = () => {
    if (this.state.injected) { return; }
    const { voucher = {}, canInject = false, domain, back, products } = this.props;
    if (!canInject) {
      send('checkoutsAction', { action: 'copy', domain });
      send('log', { action: 'coupon_autofill_field_copy_code', back });
      return;
    }
    this.setState({
      loading: true,
      injected: true,
      logoText: i18n('redeeming_voucher')
    });

    send('checkoutsAction', { action: 'apply', domain });
    send('injectCode', { code: voucher.code });
    send('log', { action: 'coupon_autofill_field_apply_action', back });
    if (products.chip) { // only for chip guys
      const restyle = { fullscreen: false };
      send('newView', { view: 'feedback', restyle, timeout: TIMEOUT_FOR_NEXT_STEP });
    } else {
      send('hideBanner', { timeout: TIMEOUT_FOR_NEXT_STEP });
    }
  }

  renderLeftColumn() {
    const { loading, logoText } = this.state;
    const { products = {} } = this.props;
    const product = chooseProduct(products);
    return (
      <div className={_css('left', `${product}-left`)}>
        <div className={_css('logo', `${product}-logo`)} />
        <div className={_css(loading ? 'spinner' : 'big-logo', `${product}-big-logo`)} />
        <div className={_css('logo-text', `${product}-logo-text`)}>{logoText}</div>
      </div>
    );
  }

  renderRightColumn() {
    const {
      back,
      voucher = {},
      canInject = false,
      domain = '',
      products = {}
    } = this.props;
    return (
      <div className={_css('right')}>
        <Content
          back={back}
          products={products}
          onClick={this.onClickPromo}
          voucher={voucher}
          canInject={canInject}
          domain={domain}
        />
      </div>
    );
  }

  render() {
    const { back } = this.props;
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('paranja')}>
        <div
          onClick={(e) => {
            if (e.isDefaultPrevented()) { return; }
            send('log', { action: 'coupon_autofill_field_outside_action', back });
            send('hideBanner');
          }}
          className={_css('wrapper')}
        >
          <div
            onClick={e => e.preventDefault()}
            className={_css('container')}
          >
            {this.renderLeftColumn()}
            {this.renderRightColumn()}
          </div>
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
