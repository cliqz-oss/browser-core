import { getResourceUrl } from '../../core/platform';
import config from '../../core/config';
import { getMessage } from '../../core/i18n';
import getTitleColor from '../utils';
import calculateValidity from './helpers';

function popup(uiInfo, { createdTs, offerState, offerId, lastUpdateTs, expirationMs }) {
  const { template_data: templateData = {}, template_name: templateName = {} } = uiInfo;
  const backgroundColor = getTitleColor(templateData);
  const { logo_class: logoClass = 'normal' } = templateData;
  const expirationTime = expirationMs // Expect this to be always greater than Date.now();
    ? (createdTs + expirationMs) / 1000
    : templateData.validity;

  const [diff, diffUnit, isExpiredSoon] = calculateValidity(expirationTime);
  const validity = expirationTime
    ? {
      text: `${getMessage('offers_expires_in')} ${diff} ${getMessage(diffUnit)}`,
      isExpiredSoon,
    } : {};

  return {
    created: createdTs,
    last_update: lastUpdateTs,
    state: offerState,
    template_name: templateName,
    template_data: templateData,
    offer_id: offerId,
    backgroundColor,
    logoClass,
    validity,
    notif_type: uiInfo.notif_type || 'tooltip',
  };
}

function tooltip(uiInfo) {
  const {
    template_data: templateData,
    notif_type: notifType
  } = uiInfo || {};
  if (!templateData) { return [false, null]; }

  const {
    logo_class: logoClass = 'normal',
    logo_url: logoUrl,
    labels = [],
    benefit,
    headline,
    title,
  } = templateData;
  const backgroundColor = getTitleColor(templateData);

  if (notifType === 'tooltip_extra') {
    return {
      showTooltip: true,
      logo: uiInfo.template_data.logo_url,
      headline: headline || title,
      benefit,
      labels,
      backgroundColor,
      logoClass,
      backgroundImage: logoUrl,
      isWebExtension: config.platform === 'webextension',
    };
  }

  return {
    showTooltip: true,
    isGeneric: true,
    headline: getMessage('offers_hub_tooltip_new_offer'),
    icon: `${config.baseURL}offers-cc/images/offers-cc-icon-white.svg`,
    isWebExtension: config.platform === 'webextension',
  };
}

function popupWrapper(uiInfo, offerId) {
  const offer = popup(uiInfo, { offerId, offerState: 'new' });
  offer.preferred = true;
  const payload = {
    offerId,
    config: {
      url: getResourceUrl('offers-cc/index.html?cross-origin'),
      type: 'offers-cc',
    },
    data: {
      vouchers: [offer],
      showExpandButton: false,
      isWebExtension: config.platform === 'webextension',
    }
  };
  return [true, payload];
}

function tooltipWrapper(uiInfo, offerId) {
  const payload = {
    data: {
      isPair: true,
      tooltip: tooltip(uiInfo),
      popup: {
        vouchers: [popup(uiInfo, offerId)],
        showExpandButton: false,
        isWebExtension: config.platform === 'webextension',
      },
    },
    offerId,
    config: {
      url: getResourceUrl('offers-cc/index.html?cross-origin'),
      type: 'offers-cc',
    },
  };
  return [true, payload];
}

export function transform(data = {}) {
  const { offer_data: { ui_info: uiInfo } = {}, offer_id: offerId } = data;
  const { notif_type: notifType } = uiInfo;
  return notifType === 'pop-up'
    ? popupWrapper(uiInfo, offerId)
    : tooltipWrapper(uiInfo, offerId);
}

export function transformMany({ offers, preferredOffer } = {}) {
  const preferredOfferId = (preferredOffer || {}).offer_id;
  const newOffers = offers.map((elem) => {
    const {
      last_update_ts: lastUpdateTs,
      created_ts: createdTs,
      attrs: { state: offerState = 'new' } = {},
      offer_id: offerId,
      offer_info: offerInfo = {}
    } = elem || {};
    const { ui_info: uiInfo, expirationMs } = offerInfo;
    if (!offerId || !uiInfo) { return null; }
    return popup(uiInfo, { createdTs, offerState, offerId, lastUpdateTs, expirationMs });
  }).filter(Boolean);

  newOffers.sort((a, b) => (b.last_update - a.last_update));
  const offersConfig = {
    url: getResourceUrl('offers-cc/index.html?cross-origin'),
    type: 'offers-cc',
    waitBeforeShowing: 15,
  };
  const newPreferredOffer = newOffers.find(elem => elem.offer_id === preferredOfferId);
  if (newPreferredOffer) {
    newPreferredOffer.preferred = true;
    const withoutPreferred = newOffers.filter(elem => elem.offer_id !== preferredOfferId);
    return {
      config: offersConfig,
      data: {
        vouchers: [newPreferredOffer].concat(withoutPreferred),
        showExpandButton: withoutPreferred.length > 0,
        isWebExtension: config.platform === 'webextension',
      }
    };
  }

  return {
    config: offersConfig,
    data: {
      vouchers: newOffers,
      noVoucher: newOffers.length === 0,
      showExpandButton: false,
      isWebExtension: config.platform === 'webextension',
    }
  };
}
