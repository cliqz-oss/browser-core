import React from 'react';
import Picture from '../widgets/Picture';
import send from '../transport';
import { css, i18n } from '../utils';

const _css = css('group-header__');
export default function GroupHeader(props) {
  const { voucher = {} } = props;
  const {
    validity: { diff, diffUnit, expired = {} } = {},
    template_data: templateData,
    offer_id: offerId
  } = voucher;
  const {
    logo_url: logoUrl,
    logo_class: logoClass,
    call_to_action: { url } = {},
  } = templateData;

  /* eslint-disable no-nested-ternary */
  const expiredClass = expired.soon
    ? 'till-soon'
    : (expired.leftSome ? 'till-left-some' : '');
  /* eslint-enable no-nested-ternary */

  const expiredText = diff !== undefined
    ? i18n(`expires_in_${diffUnit}${diff === 1 ? '' : 's'}`, diff)
    : '';

  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  return (
    <div key={voucher.offer_id} className={_css('container')}>
      <div
        className={_css('left-item')}
        onClick={() =>
          send('openURL', {
            offerId,
            url,
            closePopup: false,
            isCallToAction: true,
          })
        }
      >
        <Picture
          url={logoUrl}
          dataurl={props.logoDataurl}
          onLoadImage={props.onLoadLogo}
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
  );
  /* eslint-enable jsx-a11y/no-static-element-interactions */
}
