/* eslint-disable import/prefer-default-export */
import prefs from '../../core/prefs';
import { getResourceUrl } from '../../core/platform';
import { getTitleColor, products } from '../utils';
import config from '../../core/config';

export function transform(data = {}) {
  const { offer_data: { ui_info: uiInfo } = {}, offer_id: offerId } = data;
  const { template_name: templateName, template_data: templateData } = uiInfo || {};
  if (!templateData || !templateName) { return [false, null]; }

  const payload = {
    data: {
      template_data: {
        ...templateData,
        titleColor: getTitleColor(templateData)
      },
      template_name: templateName,
      brand: config.settings.OFFERS_BRAND
    },
    offerId,
    config: {
      type: 'browser-panel',
      url: getResourceUrl('browser-panel/index.html?cross-origin'),
      styles: {
        blueTheme: prefs.get('freshtab.blueTheme.enabled', false)
      },
      products: products(),
    },
  };
  return [true, payload];
}
