import React from 'react';
import send from '../transport';
import Header from './Header';
import Promo from './Promo';
import PromoV2 from './PromoV2';
import Conditions from './Conditions';
import Button from './Button';
import { css, resize, i18n } from '../common/utils';

const _css = css('lodge__');
export default class Lodge extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isConditionsShown: false,
      isPromoShownV2: false,
    };
  }

  componentDidMount() {
    const { data: { vouchers = [] } = {} } = this.props;
    if (vouchers.length === 0) { return; }
    const voucher = vouchers[0];
    send('seenOffer', { offer_id: voucher.offer_id });
    send('sendTelemetry', { action: 'show', offersCount: null });
    send('sendTelemetry', { action: 'show_offer' });
  }

  onConditionsClick = () => {
    const { isConditionsShown } = this.state;
    this.setState({
      isConditionsShown: !isConditionsShown
    }, () => resize({ type: 'lodgev1' }));
    if (!isConditionsShown) {
      const data = {
        action: 'click',
        target: 'conditions'
      };
      send('sendTelemetry', data);
    }
  }

  onCtaElementClick = (offerId, elemId, url) => () => {
    send('openURL', {
      offerId,
      url,
      closePopup: false,
      isCallToAction: true,
    });
    send('sendTelemetry', { target: 'use' });
  }

  renderText(voucher) {
    const {
      validity: { text = '' } = {},
      template_data: templateData = {},
      offer_id: offerId,
    } = voucher;
    const { call_to_action: { url } = {}, labels = [] } = templateData;
    const shouldShowHotDeal = labels.some(label => ['exclusive', 'best_offer'].includes(label));
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <React.Fragment>
        <div
          onClick={this.onCtaElementClick(offerId, 'benefit', url)}
          className={_css('benefit')}
        >
          {templateData.benefit}
        </div>
        <div style={{ height: '2px' }} />
        <div className={_css('ends-in')}>
          {text}
        </div>
        <div style={{ height: '20px' }} />
        {shouldShowHotDeal && (
          <div className={_css('hot-deal')}>
            <div className={_css('fire')} />
            {i18n('hot_deal')}
          </div>
        )}
      </React.Fragment>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderConditionsButton() {
    const { isConditionsShown } = this.state;
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <React.Fragment>
        <div
          className={_css('conditions')}
          onClick={this.onConditionsClick}
        >
          <span className={_css(isConditionsShown ? 'triangle-rotated' : 'triangle')}>
            &#10148;
          </span>
          &nbsp;{i18n('offers_conditions')}
        </div>
        <div style={{ height: '10px' }} />
      </React.Fragment>
    );
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
  }

  renderV1(voucher) {
    const { isConditionsShown } = this.state;
    const { template_data: { code, conditions } = {} } = voucher;
    return (
      <React.Fragment>
        {code && <Promo voucher={voucher} />}
        {!code && <Button voucher={voucher} />}
        <div style={{ height: '10px' }} />
        {conditions && this.renderConditionsButton()}
        {isConditionsShown && <Conditions voucher={voucher} />}
        {isConditionsShown && <div style={{ height: '10px' }} />}
      </React.Fragment>
    );
  }

  renderV2(voucher) {
    const { isConditionsShown, isPromoShownV2 } = this.state;
    const { template_data: { code, conditions } = {} } = voucher;
    if (!isPromoShownV2 && code) {
      return (
        <React.Fragment>
          <div
            onClick={() =>
              this.setState({
                isPromoShownV2: true
              }, () => resize({ type: 'lodgev2' }))}
            className={_css('show-code-button')}
          >
            {i18n('show_code')}
          </div>
          <div style={{ height: '12px' }} />
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        {code && <PromoV2 voucher={voucher} />}
        {!code && <Button voucher={voucher} />}
        <div style={{ height: '10px' }} />
        {conditions && this.renderConditionsButton()}
        {isConditionsShown && <Conditions voucher={voucher} />}
        {isConditionsShown && <div style={{ height: '10px' }} />}
      </React.Fragment>
    );
  }

  render() {
    const { vouchers = [], autoTrigger = false, popupsType = 'lodgev2' } = this.props.data || {};
    if (vouchers.length === 0) { return null; }
    const voucher = vouchers[0];
    return (
      <div className={_css('wrapper')}>
        <Header voucher={voucher} autoTrigger={autoTrigger} />
        <div style={{ height: '8px' }} />
        {this.renderText(voucher)}
        <div style={{ height: '7px' }} />
        {popupsType === 'lodgev1' ? this.renderV1(voucher) : this.renderV2(voucher)}
      </div>
    );
  }
}
