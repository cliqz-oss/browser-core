/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import BaseProvider from './base';

const TEMPLATE_TO_SOURCE_MAP = {
  people: 'p',
  news: 'n',
  video: 'v',
  hq: 'h',
  bm: 'm',
  reciperd: 'r',
  game: 'g',
  movie: 'o',
};

export default class BackendProvider extends BaseProvider {
  getKind({ type, template, subType }) {
    if (type === 'rh') {
      const subTypeClass = subType.class;
      let extra = '';
      if (subTypeClass) {
        extra = `|${JSON.stringify({ class: subTypeClass })}`;
      }
      return `X${extra}`;
    }

    if (type === 'bm') {
      if (!template) {
        return 'm';
      }
      return TEMPLATE_TO_SOURCE_MAP[template];
    }

    return '';
  }

  mapResults({
    results,
    query,
    provider: _provider,
    latency,
    backendCountry,
  }) {
    const provider = _provider || this.id;

    return results.map((result) => {
      const snippet = result.snippet || {};
      return {
        ...result,
        url: result.url,
        originalUrl: result.url,
        title: snippet.title,
        type: result.type,
        text: query,
        description: snippet.description,
        provider,
        // TODO: should 'latency' really be on the result itself, not the response?
        //       requirement: 'latency' needs to be present in the end for telemetry
        latency,
        backendCountry,
        data: {
          ...snippet,
          kind: [this.getKind(result)],
          template: result.template,
        },
      };
    });
  }
}
