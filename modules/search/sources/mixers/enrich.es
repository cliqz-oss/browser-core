/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { map } from 'rxjs/operators';
import deduplicate from '../operators/results/deduplicate';

const enrich = (enricher, target$, source$) =>
  enricher
    .connect(target$, source$).pipe(
      // enriching may introduce duplicate results,
      // also, history itself may contain duplicates
      map(({ results, ...response }) => ({
        ...response,
        results: deduplicate(results),
      }))
    );


export default enrich;
