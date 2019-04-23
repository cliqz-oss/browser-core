/* eslint-disable import/prefer-default-export */

import prefs from '../../core/prefs';
import {
  getResourceUrl,
  isWebExtension,
  isCliqzBrowser,
} from '../../core/platform';
import { getTitleColor } from '../utils';

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
      isWebExtension,
      isCliqzBrowser
    },
    offerId,
    config: {
      type: 'browser-panel',
      url: getResourceUrl('browser-panel/index.html?cross-origin'),
      blueTheme: prefs.get('freshtab.blueTheme.enabled', false)
    },
  };
  return [true, payload];
}
