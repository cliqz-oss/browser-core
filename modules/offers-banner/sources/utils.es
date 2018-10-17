import { getDetailsFromUrl } from '../core/url';
import utils from '../core/utils';

export default function getTitleColor(templateData = {}) {
  const {
    styles: { headline_color: headlineColor } = {},
    call_to_action: { url } = {},
  } = templateData;
  if (headlineColor) { return headlineColor; }
  const urlDetails = getDetailsFromUrl(url);
  const logoDetails = utils.getLogoDetails(urlDetails) || {};
  return `#${logoDetails.brandTxtColor}`;
}
