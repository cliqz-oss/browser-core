import React from 'react';
import send from '../transport';
import Header from './Header';
import Promo from './Promo';
import { i18n, css, resize } from '../common/utils';

const CONDITIONS_STYLE_MARKER = '✓';

const _css = css('card__');
export default class Card extends React.Component {
  state = {
    shouldRenderShowMore: true,
  }

  _getStyledConditions(conditions) {
    const { shouldRenderShowMore } = this.state;
    const maxCollapsedBullets = 2;
    const bullets = conditions.split(CONDITIONS_STYLE_MARKER).filter(Boolean);
    const shouldShowMore = bullets.length > maxCollapsedBullets && shouldRenderShowMore;
    const newConditions = shouldShowMore
      ? bullets.slice(0, maxCollapsedBullets)
      : bullets;
    return [newConditions, shouldShowMore];
  }

  _getCommonConditions(conditions) {
    const { shouldRenderShowMore } = this.state;
    const maxLetters = 80;
    const shouldShowMore = conditions.length >= maxLetters && shouldRenderShowMore;
    const newConditions = shouldShowMore
      ? `${conditions.substr(0, maxLetters)}...`
      : conditions;
    return [newConditions, shouldShowMore];
  }

  _getConditions() { // -> [boolean, string | string[], boolean]
    const { template_data: templateData = {} } = this.props.voucher || {};
    const { conditions = '' } = templateData;
    const isStyled = conditions.indexOf(CONDITIONS_STYLE_MARKER) !== -1;
    return isStyled
      ? [true, ...this._getStyledConditions(conditions)]
      : [false, ...this._getCommonConditions(conditions)];
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
    const { voucher = {}, products } = this.props;
    const { template_data: templateData = {}, offer_id: offerId } = voucher;
    const { call_to_action: { url } = {} } = templateData;
    if (!templateData.picture_dataurl || products.ghostery) { return null; }

    /* eslint-disable  jsx-a11y/no-noninteractive-element-interactions */
    return (
      <img
        alt=""
        key={offerId}
        onClick={this.onCtaElementClick(offerId, 'picture', url)}
        src={templateData.picture_dataurl}
        className={_css('image')}
      />
    );
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  }

  renderShowMore(Tag = props => <div {...props} />) {
    const { autoTrigger, products } = this.props;
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    return (
      <Tag
        className={_css('show-more')}
        onClick={() => this.setState(
          { shouldRenderShowMore: false },
          () => resize({ products, autoTrigger })
        )}
      >
        {i18n('show_more')}&nbsp;
        <div className={_css('small-triangle')} />
      </Tag>
    );
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  }

  renderStyledConditions(conditions, shouldShowMore) {
    /* eslint-disable react/no-array-index-key */
    return (
      <React.Fragment>
        <span className={_css('condition-title')}>{i18n('conditions')}:</span>
        <ul className={_css('bullets', shouldShowMore ? 'pointer' : '')}>
          {conditions.map((text, i) => <li key={i} className={_css('bullet')}>{text}</li>)}
          {shouldShowMore && this.renderShowMore(props => <li {...props} />)}
        </ul>
      </React.Fragment>
    );
    /* eslint-enable react/no-array-index-key */
  }

  renderCommonConditions(conditions, shouldShowMore) {
    if (!shouldShowMore) { return conditions; }
    return (
      <React.Fragment>
        {conditions}
        {shouldShowMore && this.renderShowMore()}
      </React.Fragment>
    );
  }

  renderConditions() {
    const [isStyled, conditions, shouldShowMore] = this._getConditions();
    return isStyled
      ? this.renderStyledConditions(conditions, shouldShowMore)
      : this.renderCommonConditions(conditions, shouldShowMore);
  }

  renderText() {
    const { voucher = {} } = this.props;
    const {
      template_data: templateData = {},
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
          className={_css('headline')}
        >
          {templateData.headline}
        </div>
        <div style={{ height: '9px' }} />
        <div className={_css('description')}> {this.renderConditions()} </div>
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderOffer() {
    return (
      <div className={_css('screen-main')}>
        {this.renderImage()}
        <div style={{ height: '8px' }} />
        {this.renderText()}
      </div>
    );
  }

  renderPromo() {
    const {
      onChangeCodeStatus,
      isCodeHidden,
      products,
      voucher = {},
    } = this.props;
    return (
      <React.Fragment>
        <Promo
          products={products}
          isCodeHidden={isCodeHidden}
          onCopyCode={onChangeCodeStatus}
          voucher={voucher}
        />
        <div style={{ height: '15px' }} />
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
          {this.renderOffer()}
        </div>
        <div style={{ height: '20px' }} />
        {this.renderPromo()}
      </div>
    );
  }
}
