import React from 'react';
import Picture from '../widgets/Picture';
import send from '../transport';
import { css, i18n, chooseProduct } from '../utils';

const _css = css('group-header__');
export default class GroupHeader extends React.Component {
  state = {
    pictureError: false
  }

  onCtaElementClick(offerId, elemId, url) {
    send('openURL', {
      offerId,
      url,
      elemId,
      closePopup: false,
      isCallToAction: true,
    });
  }

  render() {
    const { voucher = {}, products, notification, autoTrigger } = this.props;
    const { pictureError } = this.state;
    const {
      validity: { diff, diffUnit, expired = {} } = {},
      template_data: templateData,
      offer_id: offerId,
    } = voucher;
    const {
      logo_url: logoUrl,
      logo_class: logoClass,
      picture_url: pictureUrl,
      call_to_action: { url = '' } = {},
    } = templateData;
    const product = chooseProduct(products);

    /* eslint-disable no-nested-ternary */
    const expiredClass = expired.soon
      ? 'till-soon'
      : (expired.leftSome ? 'till-left-some' : '');
    /* eslint-enable no-nested-ternary */

    const expiredText = diff !== undefined
      ? i18n(`expires_in_${diffUnit}${diff === 1 ? '' : 's'}`, diff)
      : '';

    const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
    const shouldShowPicture = pictureUrl && autoTrigger && products.ghostery && !pictureError;
    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <>
        <div
          onClick={this.props.onClick}
          key={voucher.offer_id}
          className={_css('container')}
        >
          <div className={_css('left-item')}>
            {notification && (
              <div className={_css('notification', `${product}-notification`)}>
                {notification}
              </div>
            )}
            <Picture
              url={logoUrl}
              dataurl={this.props.logoDataurl}
              onLoadImage={this.props.onLoadLogo}
              height="34px"
              width={sizesByClass[logoClass] || '83px'}
            />
          </div>
          <div className={_css('right-item')}>
            <div className={_css('expired-icon', `${expiredClass}-icon`)} />
            <div className={_css('till-wrapper')}>
              <div className={_css('till', expiredClass)}>{expiredText}</div>
              <div className={_css('affiliate-link')}>
                {i18n('affiliate_link')}
              </div>
            </div>
          </div>
        </div>
        {shouldShowPicture && (
          <div
            onClick={() => this.onCtaElementClick(offerId, 'picture', url)}
            className={_css('picture')}
          >
            <Picture
              url={pictureUrl}
              dataurl={this.props.pictureDataurl}
              onLoadImage={this.props.onLoadPicture}
              onError={() => this.setState({ pictureError: true }, window.__globals_resize)}
              height="148px"
              width="100%"
            />
          </div>
        )}
      </>
    );
    /* eslint-enable jsx-a11y/no-static-element-interactions */
  }
}
