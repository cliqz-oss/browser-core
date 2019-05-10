import React from 'react';
import send from '../transport';
import { css, i18n } from '../common/utils';

const _css = css('card-promo__');
export default class Promo extends React.Component {
  constructor(props) {
    super(props);
    const { voucher = {}, isCodeHidden } = props;
    const { template_data: templateData = {} } = voucher;
    this.state = {
      code: templateData.code,
      buttonText: i18n(isCodeHidden ? 'offers_hub_get_code_btn' : 'offers_hub_copy_btn'),
      isCodeHidden,
      copied: false,
      isOpenCTAurl: false,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (!props.isCodeHidden && props.isCodeHidden !== state.isCodeHidden) {
      return {
        buttonText: i18n('offers_hub_copy_btn'),
        isOpenCTAurl: true,
      };
    }
    return state;
  }

  onClickCopyCode() {
    const { voucher = {}, onCopyCode } = this.props;
    const { isOpenCTAurl } = this.state;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    onCopyCode();
    if (!isOpenCTAurl) {
      send('openURL', {
        offerId,
        url,
        closePopup: false,
        isBackgroundTab: true,
      });
    }
    this.setState({
      buttonText: i18n('offers_hub_code_copy'),
      isCodeHidden: false,
      copied: true,
      isOpenCTAurl: true,
    });
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'code_copied',
      offer_id: offerId,
    });
    send('sendTelemetry', { target: 'copy_code' });
  }

  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  render() {
    const { products } = this.props;
    const { code, buttonText, copied, isCodeHidden } = this.state;
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
            className={_css(`${products.chip ? 'chip' : 'myoffrz'}-copy-code`)}
          >
            {buttonText}
          </span>
        </div>
      </div>
    );
  }
}
