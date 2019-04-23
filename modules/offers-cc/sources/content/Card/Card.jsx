import React from 'react';
import send from '../transport';
import Header from './Header';
import Promo from './Promo';
import Conditions from './Conditions';
import { css, resize } from '../common/utils';

const _css = css('card__');
export default class Card extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isConditionsShown: false,
    };
  }

  onConditionsClick = () => {
    const { isConditionsShown } = this.state;
    this.setState({ isConditionsShown: !isConditionsShown }, resize);
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

  renderImage() {
    const { voucher = {} } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    if (!templateData.picture_dataurl) { return null; }
    return (
      <div
        onClick={this.onCtaElementClick(offerId, 'picture', url)}
        style={{ backgroundImage: `url(${templateData.picture_dataurl})` }}
        className={_css('image')}
      />
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderText() {
    const { voucher = {} } = this.props;
    const {
      template_data: templateData = {},
      backgroundColor = '#494949',
      offer_id: offerId,
    } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('text')}>
        <div
          onClick={this.onCtaElementClick(offerId, 'benefit', url)}
          className={_css('benefit')}
        >
          {templateData.benefit}
        </div>
        <div
          onClick={this.onCtaElementClick(offerId, 'headline', url)}
          style={{ color: backgroundColor }}
          className={_css('headline')}
        >
          {templateData.headline}
        </div>
        <div style={{ height: '11px' }} />
        <div
          onClick={this.onCtaElementClick(offerId, 'description', url)}
          className={_css('description')}
        >
          {templateData.desc}
        </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderButton() {
    const { voucher = {}, onChangeCodeStatus, products } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { text, url } = {} } = templateData;
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div
        onClick={() => {
          onChangeCodeStatus();
          send('openURL', {
            offerId,
            url,
            closePopup: false,
            isCallToAction: true,
          });
          send('sendTelemetry', { target: 'use' });
        }}
        className={_css('button', `${products.chip ? 'chip' : 'myoffrz'}-button`)}
      >
        {text}
      </div>
    );
    /* eslint-disable jsx-a11y/no-static-element-interactions */
  }

  renderOfferIfVisible() {
    const visibility = !this.state.isConditionsShown ? 'visible' : 'hidden';
    return (
      <div
        className={_css('screen-main')}
        style={{ visibility }}
      >
        {this.renderImage()}
        <div style={{ height: '2px' }} />
        {this.renderText()}
      </div>
    );
  }

  renderOfferWithConditionsIfVisible() {
    const { voucher = {} } = this.props;
    const { template_data: templateData = {} } = voucher;

    const display = this.state.isConditionsShown ? 'block' : 'none';
    return (
      <div
        className={_css('screen-secondary')}
        style={{ display }}
      >
        <div className={_css('text')}>
          <div className={_css('benefit')}>{templateData.benefit}</div>
          <div style={{ height: '11px' }} />
          <div className={_css('conditions')}>{templateData.conditions}</div>
        </div>
      </div>
    );
  }

  renderPromoIfNeeded() {
    const { isConditionsShown } = this.state;
    const { voucher = {}, onChangeCodeStatus, isCodeHidden, products } = this.props;
    const { template_data: templateData = {} } = voucher;
    return (
      <React.Fragment>
        {templateData.code && (
        <Promo
          products={products}
          isCodeHidden={isCodeHidden}
          onCopyCode={onChangeCodeStatus}
          voucher={voucher}
        />
        ) }
        <div style={{ height: '4px' }} />
        <Conditions
          products={products}
          active={isConditionsShown}
          voucher={voucher}
          onClick={this.onConditionsClick}
        />
        <div style={{ height: '13px' }} />
      </React.Fragment>
    );
  }

  render() {
    const { voucher = {}, onRemove, autoTrigger } = this.props;
    return (
      <div className={_css('wrapper')}>
        <Header
          onRemove={onRemove}
          voucher={voucher}
          autoTrigger={autoTrigger}
        />
        <div style={{ height: '7px' }} />
        <div className={_css('screen-container')}>
          {this.renderOfferIfVisible()}
          {this.renderOfferWithConditionsIfVisible()}
        </div>
        <div style={{ height: '20px' }} />
        {this.renderPromoIfNeeded()}
        {this.renderButton()}
      </div>
    );
  }
}
