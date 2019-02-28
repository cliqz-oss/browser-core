import { getResourceUrl, isCliqzBrowser, isWebExtension } from '../../core/platform';
import config from '../../core/config';
import { getMessage } from '../../core/i18n';
import { getTitleColor } from '../utils';
import calculateValidity from './helpers';

// should be read-only
const COMMON_DATA = {
  isCliqzBrowser,
  isWebExtension,
};

function popup(uiInfo, {
  createdTs,
  offerId,
  lastUpdateTs,
  expirationMs,
  attrs: { state: offerState = 'new', isCodeHidden },
}) {
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
    isCodeHidden,
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
    logo_dataurl: logoDataurl,
    labels = [],
    benefit,
    headline,
    title,
  } = templateData;
  const backgroundColor = getTitleColor(templateData);

  if (notifType === 'tooltip_extra') {
    return {
      ...COMMON_DATA,
      showTooltip: true,
      logo: uiInfo.template_data.logo_dataurl,
      headline: headline || title,
      benefit,
      labels,
      backgroundColor,
      logoClass,
      backgroundImage: logoDataurl,
    };
  }

  return {
    ...COMMON_DATA,
    showTooltip: true,
    isGeneric: true,
    headline: getMessage('offers_hub_tooltip_new_offer'),
    icon: `${config.baseURL}offers-cc/images/offers-cc-icon-white.svg`,
  };
}

function popupWrapper(offerId, { uiInfo, expirationMs, createdTs, attrs }) {
  const offer = popup(uiInfo, {
    offerId,
    expirationMs,
    createdTs,
    attrs: { ...attrs, state: 'new' },
  });
  offer.preferred = true;
  const payload = {
    offerId,
    config: {
      url: getResourceUrl('offers-cc/index.html?cross-origin'),
      type: 'offers-cc',
    },
    data: {
      ...COMMON_DATA,
      vouchers: [offer],
      showExpandButton: false,
    }
  };
  return [true, payload];
}

function tooltipWrapper(offerId, {
  uiInfo,
  expirationMs,
  createdTs,
  attrs,
}) {
  const payload = {
    data: {
      isPair: true,
      tooltip: tooltip(uiInfo),
      popup: {
        ...COMMON_DATA,
        vouchers: [popup(uiInfo, { offerId, expirationMs, createdTs, attrs })],
        showExpandButton: false,
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
  const {
    createdTs,
    offer_data: { ui_info: uiInfo, expirationMs } = {},
    offer_id: offerId,
    attrs,
  } = data;
  const { notif_type: notifType } = uiInfo;
  return notifType === 'pop-up'
    ? popupWrapper(offerId, { uiInfo, expirationMs, createdTs, attrs })
    : tooltipWrapper(offerId, { uiInfo, expirationMs, createdTs, attrs });
}

export function transformMany({ offers, preferredOffer } = {}) {
  const preferredOfferId = (preferredOffer || {}).offer_id;
  const newOffers = offers.map((elem) => {
    const {
      last_update_ts: lastUpdateTs,
      created_ts: createdTs,
      attrs,
      offer_id: offerId,
      offer_info: offerInfo = {}
    } = elem || {};
    const { ui_info: uiInfo, expirationMs } = offerInfo;
    if (!offerId || !uiInfo) { return null; }
    return popup(uiInfo, {
      createdTs,
      offerId,
      lastUpdateTs,
      expirationMs,
      attrs,
    });
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
        ...COMMON_DATA,
        vouchers: [newPreferredOffer].concat(withoutPreferred),
        showExpandButton: withoutPreferred.length > 0,
      }
    };
  }

  return {
    config: offersConfig,
    data: {
      ...COMMON_DATA,
      vouchers: newOffers,
      noVoucher: newOffers.length === 0,
      showExpandButton: false,
    }
  };
}
