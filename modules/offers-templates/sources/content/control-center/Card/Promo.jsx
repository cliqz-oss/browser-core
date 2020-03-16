import React from 'react';
import send from '../../transport';
import { css, i18n, chooseProduct } from '../../utils';

const _css = css('card-promo__');
export default class Promo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isCodeHidden: this.props.isCodeHidden,
      copied: false,
    };
  }

  onClickCopyCode() {
    const { voucher = {}, onCopyCode } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    onCopyCode();

    // setTimeout -> to provide user a visual effect of coping
    setTimeout(() => send('openURL', {
      offerId,
      url,
      closePopup: false,
      isCallToAction: true,
    }), 250);

    this.setState({ isCodeHidden: false, copied: true });
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'code_copied',
      offer_id: offerId,
    });
  }

  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  renderButton() {
    const { voucher = {}, products } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url, text } = {} } = templateData;
    const prefix = chooseProduct(products);
    return (
      <div
        onClick={
          () => send('openURL', {
            offerId,
            url,
            closePopup: false,
            isCallToAction: true,
          })
        }
        className={_css('button', `${prefix}-button`)}
      >
        {text}
      </div>
    );
  }

  renderCopyCode() {
    const { products, voucher = {} } = this.props;
    const { template_data: { code = '' } = {} } = voucher;
    const { copied, isCodeHidden } = this.state;
    const prefix = chooseProduct(products);
    const newCode = isCodeHidden ? `${code.substring(0, 3)}...` : code;
    return (
      <div className={_css('wrapper', `${prefix}-wrapper`)}>
        <div className={_css('container')}>
          <input
            ref={(input) => {
              if (!input || !copied) { return; }
              input.select();
              window.document.execCommand('copy');
              if (copied) { this.setState({ copied: false }); }
            }}
            readOnly
            className={_css('input', `${prefix}-input`)}
            value={newCode}
          />
          <div
            onClick={this.onClickCopyCode.bind(this)}
            className={_css('copy-code')}
          >
            {i18n('copy_and_go')}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { voucher = {} } = this.props;
    const { template_data: { code } = {} } = voucher;
    if (!code) { return this.renderButton(); }
    return this.renderCopyCode();
  }
}
