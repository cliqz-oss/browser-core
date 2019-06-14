import React from 'react';
import send from '../transport';
import { css, i18n } from '../common/utils';

const _css = css('lodge-promo__');
export default class Promo extends React.Component {
  state = {
    code: '* * * * *',
    buttonText: 'copy & go',
    copied: false,
  }

  onClickCopyCode() {
    const { voucher = {} } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    this.setState({
      buttonText: i18n('offers_hub_code_copy'),
      copied: true,
      code: templateData.code,
    });
    setTimeout(() => send('openURL', {
      offerId,
      url,
      closePopup: false,
      isCallToAction: true,
    }), 300); // by design
    send('sendOfferActionSignal', {
      signal_type: 'offer-action-signal',
      element_id: 'code_copied',
      offer_id: offerId,
    });
    send('sendTelemetry', { target: 'copy-code' });
  }

  /* eslint-disable  jsx-a11y/no-static-element-interactions */
  render() {
    const { code, buttonText, copied } = this.state;
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
          value={code}
        />
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
