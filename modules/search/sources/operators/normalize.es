/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  getFriendlyUrl,
  parse,
  strip,
  tryDecodeURI,
} from '../../core/url';

const clean = (result) => {
  const details = parse(result.url);
  const host = strip((details && details.hostname) || '', {
    spaces: false,
    www: true,
    mobile: true,
  });
  let hostAndPort = host;
  const friendlyUrl = tryDecodeURI(result.friendlyUrl || getFriendlyUrl(details) || '');
  const url = result.url ? tryDecodeURI(result.url) : '';

  if (details && details.port) {
    hostAndPort += `:${details.port}`;
  }

  return {
    url,
    href: url,
    friendlyUrl,
    title: result.title,
    description: result.description,
    // TODO: clean `extra`
    extra: result.extra,
    image: result.image,
    kind: result.kind || [],
    style: result.style,
    provider: result.provider,
    template: result.template,
    suggestion: result.suggestion,
    text: result.text,
    // TODO: use template for supplementary-search
    type: result.type,
    meta: {
      ...result.meta,
      isIncomplete: result._incomplete,
      triggerMethod: result.trigger_method,
      domain: details ? details.generalDomain : undefined,
      host,
      hostAndPort,
      port: details ? details.port : undefined,
      url: strip(result.url || '', {
        protocol: true,
        www: true,
        mobile: true,
        trailingSlash: true,
      }),
      score: result.score,
      subType: result.subType || {},
      latency: result.latency,
      backendCountry: result.backendCountry,
    }
  };
};

/*
 * Normalizes a result to facilitate processing. Most importantly, flattens
 * links. Opposite of `oeprators/reconstruct`.
 *
 * @param {Object} result - The result.
 */
// TODO: just collect all non 'deepResults' data keys instead of naming them explicitly
const normalize = ({
  data: { deepResults = [], extra = {}, kind, template, suggestion, friendlyUrl } = {},
  ...result
}) => ({
  links: [
    {
      ...clean({ ...result, extra, kind, template, suggestion, friendlyUrl, meta: { level: 0, type: 'main' } }),
    },
    ...deepResults.map(
      ({ links, type }) => links.map(link => clean({ ...link, meta: { level: 1, type } }))
    ).reduce((a, b) => a.concat(b), [])
  ],
});

// TODO: store main link explicitly?
const getMainLink = ({ links }) => links
  .slice(0, 1)
  .find(({ meta: { type } }) => type === 'main');

const hasMainLink = ({ links }) => links
  .slice(0, 1)
  .some(({ meta: { type } }) => type === 'main');

export default normalize;
export { clean, getMainLink, hasMainLink };
