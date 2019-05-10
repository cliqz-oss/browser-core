import React from 'react';
import send from '../transport';
import { css, i18n } from '../common/utils';

const _css = css('lodge-promo-v2__');
export default class PromoV2 extends React.Component {
  state = {
    buttonText: 'copy & go',
    copied: false,
  }

  onClickCopyCode() {
    const { voucher = {} } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    send('openURL', {
      offerId,
      url,
      closePopup: false,
      isCallToAction: true,
    });
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'code_copied',
      offer_id: offerId,
    });
    send('sendTelemetry', { target: 'copy-code' });
    this.setState({
      buttonText: i18n('offers_hub_code_copy'),
      copied: true,
    });
  }

  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  render() {
    const { buttonText, copied } = this.state;
    const { voucher = {} } = this.props;
    const { template_data: templateData = {} } = voucher;
    return (
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
          value={templateData.code}
        />
        <div style={{ height: '4px' }} />
        <div
          onClick={this.onClickCopyCode.bind(this)}
          className={_css('copy-code')}
        >
          {buttonText}
        </div>
      </div>
    );
  }
}
