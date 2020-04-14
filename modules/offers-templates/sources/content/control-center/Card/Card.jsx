import React from 'react';
import Promo from './Promo';
import { removeWord } from '../algorithms';
import BulletedList from '../../widgets/BulletedList';
import send from '../../transport';
import { i18n, css } from '../../utils';

const CONDITIONS_STYLE_MARKER = '✓';

const _css = css('card__');
export default class Card extends React.Component {
  onCtaElementClick(offerId, elemId, url) {
    send('openURL', {
      offerId,
      url,
      elemId,
      closePopup: false,
      isCallToAction: true,
    });
  }

  renderText(conditions) {
    const { voucher = {}, autoTrigger, onRemove, products } = this.props;
    const {
      template_data: templateData = {},
      offer_id: offerId,
    } = voucher;
    const { call_to_action: { url } = {} } = templateData;

    /* eslint-disable  jsx-a11y/no-static-element-interactions */
    return (
      <div className={_css('text')}>
        {templateData.benefit && (
        <div
          onClick={() => this.onCtaElementClick(offerId, 'benefit', url)}
          className={_css('benefit')}
        >
          {templateData.benefit}
        </div>
        )}
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
        {products.ghostery && templateData.desc && (
          <>
            <div className={_css('description')}>{templateData.desc}</div>
            <div style={{ height: '9px' }} />
          </>
        )}
        <BulletedList
          marker={CONDITIONS_STYLE_MARKER}
          content={conditions}
          onChangeSize={window.__globals_resize}
          maxLetters={80}
          openBullets={products.ghostery ? 2 : 0}
          title={i18n('conditions')}
          showMoreLabel={i18n('show_more')}
        />
      </div>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }

  renderOffer() {
    const { voucher = {}, products } = this.props;
    const { template_data: { conditions = '' } = {} } = voucher;
    const [isGhosteryPromo, newConditions] = products.ghostery
      ? removeWord(conditions, 'ghosteryPromoMidnight')
      : [false, conditions];
    return (
      <div className={_css('screen-main')}>
        {this.renderText(newConditions)}
        <div style={{ height: '13px' }} />
        {this.renderPromo(isGhosteryPromo)}
      </div>
    );
  }

  renderPromo(isGhosteryPromo = false) {
    const {
      onChangeCodeStatus,
      isCodeHidden,
      products,
      autoTrigger,
      voucher = {},
    } = this.props;
    return (
      <React.Fragment>
        <Promo
          products={products}
          autoTrigger={autoTrigger}
          isCodeHidden={isCodeHidden && !isGhosteryPromo}
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
