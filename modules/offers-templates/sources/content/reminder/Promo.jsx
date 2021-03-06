import React from 'react';
import send from '../transport';
import { css, i18n, chooseProduct } from '../utils';

const _css = css('promo__');
export default class Promo extends React.Component {
  constructor(props) {
    super(props);
    const isCodeHidden = props.voucher.isCodeHidden || false;
    this.state = {
      copied: false,
      buttonText: isCodeHidden ? i18n('get_code') : i18n('copy_code'),
      isCodeHidden,
      isOpenCTAurl: false,
    };
  }

  onClickCopyCode() {
    const { ctaurl: url, offerId, landing } = this.props.voucher;
    const { isOpenCTAurl } = this.state;
    this.setState({
      buttonText: i18n('copied'),
      isCodeHidden: false,
      copied: true,
      isOpenCTAurl: true,
    });
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'code_copied',
      offer_id: offerId,
    });

    if (!isOpenCTAurl) {
      send('openAndClosePinnedURL', { url, matchPatterns: landing || [] });
    }
  }

  render() {
    const { buttonText, copied, isCodeHidden } = this.state;
    const { voucher, products } = this.props;
    const { code } = voucher;
    if (!code) { return null; }
    const product = chooseProduct(products);

    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('wrapper')}>
        <div className={_css('container')}>
          <input
            ref={(input) => {
              if (!input || !copied) { return; }
              input.select();
              window.document.execCommand('copy');
              if (copied) { this.setState({ copied: false }); }
            }}
            readOnly
            className={_css('input')}
            value={isCodeHidden ? '* * * * *' : code}
          />
          <span
            onClick={this.onClickCopyCode.bind(this)}
            className={_css('copy-code', `${product}-copy-code`)}
          >
            {buttonText}
          </span>
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
