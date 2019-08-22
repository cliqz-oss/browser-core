/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint no-param-reassign: 'off' */

import logos from '../core/services/logos';
import { URLInfo } from '../core/url-info';
import { getCleanHost } from '../core/url';

function getAlias(host, searchEngines) {
  const engine = searchEngines.find(
    ({ urlDetails }) =>
      host === urlDetails.host || host === urlDetails.domain
  ) || {};

  return engine.alias;
}

const ALLOWED_SCHEMES = ['http:', 'https:', 'ftp:', 'resource:'];

export default class SpeedDial {
  static getValidUrl(url) {
    let uri = URLInfo.get(url);
    if (!uri || !uri.protocol) {
      url = url.replace(/^:?\/*/, '');
      url = `http://${url}`;
      uri = URLInfo.get(url);
    }

    return (
      uri
      && ALLOWED_SCHEMES.indexOf(uri.protocol) !== -1
      && url
    ) || null;
  }

  static updateLogo(item) {
    const logoDetails = logos.getLogoDetails(item.url);

    item.logo = logoDetails;
    return item;
  }

  constructor({ url, title = '', isCustom = true }, searchEngines) {
    const details = URLInfo.get(url);
    const logoDetails = logos.getLogoDetails(url);
    this.title = url;
    const displayTitle = title;
    const protocolPos = url.indexOf('://');
    let id = url;
    // removes protocol http(s), ftp, ...
    if (protocolPos !== -1 && protocolPos <= 6) {
      id = url.split('://')[1];
    }
    this.id = id;
    this.url = url;
    this.displayTitle = displayTitle || getCleanHost(details) || url;
    this.custom = isCustom;
    this.logo = logoDetails;
    this.searchAlias = getAlias(details.hostname, searchEngines);
  }
}
