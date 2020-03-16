import React from 'react';
import Promo from './Promo';
import send from '../../transport';
import { i18n, css } from '../../utils';

const CONDITIONS_STYLE_MARKER = '✓';

const _css = css('card__');
export default class Card extends React.Component {
  state = {
    collapsed: true,
  }

  onCtaElementClick(offerId, elemId, url) {
    send('openURL', {
      offerId,
      url,
      closePopup: false,
      isCallToAction: true,
    });
  }

  _getStyledConditions(conditions) {
    const bullets = conditions.split(CONDITIONS_STYLE_MARKER).filter(Boolean);
    return [bullets, !this.state.collapsed];
  }

  _getCommonConditions(conditions) {
    const { collapsed } = this.state;
    const maxLetters = 80;
    const shouldShowMore = conditions.length >= maxLetters && collapsed;
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

  renderShowMore(Tag = props => <div {...props} />) {
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    return (
      <Tag
        className={_css('show-more')}
        onClick={() => this.setState({ collapsed: false }, window.__globals_resize)}
      >
        {i18n('show_more')}&nbsp;
        <div className={_css('small-triangle')} />
      </Tag>
    );
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
  }

  renderStyledConditions(conditions, shouldShowMore) {
    const { collapsed } = this.state;
    const rotatedCls = !collapsed ? 'small-triangle-rotated' : '';
    /* eslint-disable react/no-array-index-key */
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <React.Fragment>
        <span
          onClick={() => this.setState({ collapsed: !collapsed }, window.__globals_resize)}
          className={_css('condition-title')}
        >
          {i18n('conditions')}&nbsp;
          <div className={_css('small-triangle', rotatedCls)} />
        </span>
        {shouldShowMore && (
          <ul className={_css('bullets')}>
            {conditions.map((text, i) => <li key={i} className={_css('bullet')}>{text}</li>)}
          </ul>
        )}
      </React.Fragment>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
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
    const { voucher = {}, autoTrigger, onRemove } = this.props;
    const {
      template_data: templateData = {},
      offer_id: offerId,
    } = voucher;
    const { call_to_action: { url } = {} } = templateData;

    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('text')}>
        <div
          onClick={() => this.onCtaElementClick(offerId, 'benefit', url)}
          className={_css('benefit')}
        >
          {templateData.benefit}
        </div>
        {!autoTrigger && (
        <div
          onClick={onRemove}
          className={_css('trash')}
        />
        )}
        <div style={{ height: '3px' }} />
        <div
          onClick={() => this.onCtaElementClick(offerId, 'headline', url)}
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
        {this.renderText()}
        <div style={{ height: '13px' }} />
        {this.renderPromo()}
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
        <div style={{ height: '8px' }} />
      </React.Fragment>
    );
  }

  render() {
    const { voucher = {} } = this.props;
    return (
      <div key={voucher.offer_id} className={_css('wrapper')}>
        <div style={{ height: '5px' }} />
        <div className={_css('screen-container')}>
          {this.renderOffer()}
          <div style={{ height: '8px' }} />
        </div>
      </div>
    );
  }
}
