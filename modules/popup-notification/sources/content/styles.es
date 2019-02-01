/* eslint-disable import/prefer-default-export */

function styles({
  ghostery = false,
  logo_class: logoClass,
  styles: { headline_color: headlineColor } = {},
  baseUrl,
} = {}) {
  const rewardIconPath = ghostery ? 'ghostery-rewards-beta.svg' : 'offers-cc-icon.svg';
  const offerLogoSize = ghostery ? '111px' : '20px';
  const [mainColor, secondaryColor, tertiaryColor] = ghostery
    ? ['#930194', '#920094', '#850587']
    : ['#00AEF0', '#0078CA', '#0078CA'];
  const sizesByClass = { square: '30px', short: '55px', normal: '70px', long: '105px' };
  const logoSize = sizesByClass[logoClass] || '70px';
  return `
    body {
      overflow: hidden;
    }

    .content {
      position: relative;
      width: 100%;
      height: 100%;
      background-color: #fff;
      z-index: 2147483646;
      text-align: center;
      border-radius: 5px;

      display: flex;
      flex-direction: column;
      font-family: "-mac-system", "-apple-system", BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }

    .header {
      height: 45px;
      border-bottom: 1px solid #DEDEDE;
      background-color: #F2F2F2;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .header > .offer-logo {
      height: 100%;
      font-size: 16.5px;
      font-weight: 500;
      color: #363636;
      text-align: left;
      padding-left: ${offerLogoSize};
      margin-left: 16px;
      background-repeat: no-repeat;
      background-image: url(${baseUrl}images/${rewardIconPath});
      background-position: center;
    }

    .header > .btn-close {
      width: 14px;
      height: 14px;
      opacity: 0.6;
      cursor: pointer;
      padding-right: 22px;
      margin-top: -2px;
      background-repeat: no-repeat;
      background-image: url(${baseUrl}images/close-icon.svg);
    }

    .header > .billet {
      display: block;
      min-height: 46px;
      width: 99%;
    }

    .sub-header > .billet {
      display: block;
      width: 100%;
    }

    .sub-header > .billet:last-child {
      display: block;
      width: 1px;
      padding-right: 32px;
    }

    .header > .btn-close:hover {
      opacity: 1;
    }

    .sub-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding-top: 12px;
    }

    .sub-header > .labels {
      display: flex;
      flex-direction: column;
      white-space: nowrap;
      margin-left: 35px;
    }

    .sub-header > .labels > .exclusive{
      background-image: url(${baseUrl}images/exclusive.svg);
    }

    .sub-header > .labels > .best_offer{
      background-image: url(${baseUrl}images/best_offer.svg);
    }

    .sub-header > .labels > .offer_of_the_week{
      background-image: url(${baseUrl}images/offer_of_the_week.svg);
    }

    .sub-header > .labels > .label {
      padding-left: 14px;
      color: #B2B2B2;
      font-family: 'Arial Narrow', 'Impact';
      letter-spacing: 1px;
      text-transform: uppercase;
      font-size: 8.5px;
      font-weight: 400;
      background-size: 12px 10px;
      background-repeat: no-repeat;
      background-position: left center;
      margin-bottom: 2px;
    }

    .sub-header > .wrapper {
      display: inline-block;
      min-width: ${logoSize};
      height: 32px;
    }

    .sub-header > .wrapper > .logo {
      display: inline-block;
      background-color: transparent;
      padding: 0;
      min-width: 100%;
      min-height: 100%;
      background-repeat: no-repeat;
      background-size: contain;
    }


    .benefit {
      font-size: 32px;
      font-weight: 500;
      color: #494949;
      padding: 7px 0 9px 0;
      overflow: hidden;
    }

    .headline {
      padding: 0 30px;
      font-size: 19px;
      font-weight: 350;
      padding-bottom: 21px;
      color: ${headlineColor || 'black'};
    }

    .code-wrapper {
      background-color: #F2F2F2;
      border: 1px solid #DADADA;
      height: 32px;
      margin: 0 18px;
      border-radius: 4px;
      display: flex;
      align-items: center;
    }

    .code-wrapper > .promo-code {
      border: none;
      color: transparent;
      text-shadow: 0 0 0 #000;
      font-size: 13px;
      background-color: transparent;
      font-weight: 600;

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-left: 16px;
      padding-right: 43%;
    }

    .code-wrapper > .copy-code {
      cursor: pointer;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      color: #687E90;
      white-space: nowrap;
      margin-right: 14px;
    }

    .code-wrapper > .copy-code:hover {
      color: ${mainColor};
    }

    .footer {
      background-color: #fff;
      border-radius: 0 0 5px 5px;
    }

    .footer > button {
      margin-top: 31px;
      margin-left: 5px;
      margin-right: 5px;
      padding: 12px 8px;
      letter-spacing: 0.5px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid #ccc;
      border-radius: 4px;
      min-width: 150px;
      cursor: pointer;
      text-transform: uppercase;
      background-color: #fff;
    }

    .footer > button.btn-cancel:hover {
      color: ${secondaryColor};
      border-color: ${secondaryColor};
    }

    .footer > button.btn-apply {
      background-color: ${mainColor};
      border-color: ${mainColor};
      color: #fff;
    }

    .footer > button.btn-apply:hover {
      background-color: ${tertiaryColor};
      border-color: ${tertiaryColor};
    }

    .none {
      display: none;
    }

    .middle {
      background-color: #fff;
    }

    .footer-billet {
      padding-bottom: 20px;
    }

    .conditions {
      text-align: right;
      padding-top: 3px;
      color: #B2B2B2;
      font-size: x-small;
    }

    .tooltip {
      position: relative;
      display: inline-block;
      border-bottom: 1px dotted #B2B2B2;
      margin-right: 27px;
    }

    .tooltip .tooltip-text {
      box-shadow: rgba(0, 0, 0, 0.19) 3px 2px 13px 2px;
      visibility: hidden;
      width: 180px;
      background-color: gray;
      color: #fff;
      text-align: left;
      border-radius: 6px;
      padding: 5px 8px;

      position: absolute;
      z-index: 1;
      bottom: 11px;
      right: -11px;
    }

    .tooltip:hover .tooltip-text {
      visibility: visible;
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 200px;
    }`;
}

function popupStyles({ shouldHideButtons = false, headline = '' }) {
  const halfOfLine = 32;
  let containerHeight = headline.length > halfOfLine ? '372px' : '352px';
  if (shouldHideButtons) { containerHeight = '280px'; }
  return {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    margin: 'auto',
    'box-shadow': '0px 10px 24px -7px rgba(0, 0, 0, 0.75);',
    width: '450px',
    height: containerHeight,
    transition: 'all 200ms ease-in',
    opacity: '0',
    'z-index': 2147483647,
    'line-height': 1,
  };
}

const PARANJA_STYLES = {
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  'background-color': 'rgba(0,0,0,0.5)',
  'z-index': 2147483645,
  transition: 'all 200ms ease-in',
  opacity: '0',
};

export { styles, PARANJA_STYLES, popupStyles };
