/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import readline from 'readline';
import Rx from 'rxjs';
import { mixed, results } from './search';

const user = {
  read: () => {
    if (user.observable) {
      return user.observable;
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);

    user.observable = Rx.Observable.create((observer) => { user.observer = observer; }).publish();

    process.stdin.on('keypress', (str, meta) => {
      if (meta && meta.ctrl && meta.name === 'c') {
        process.exit();
      } else {
        user.observer.next({ str, meta });
      }
    });

    user.observable.connect();

    return user.observable;
  }
};

const query = user.read()
  .scan((q, { str, meta }) => {
    if (meta.name === 'backspace') {
      return { str: q.str.slice(0, -1) };
    }
    return { str: q.str + (str || '') };
  })
  .map(q => q.str)
  .distinctUntilChanged()
  .debounceTime(250)
  .publish();

const log = (topic, ...args) => {
  /* eslint-disable */
  console.log(`\t${topic}:\t`, ...args);
  /* eslint-enable */
};

const res = results(query);
const mix = mixed(res, query);

query.subscribe(q => log('query', q));
res.subscribe(result => log('result', result, result.url, result.query, result.provider));
mix.subscribe(m => log('mixed', '\n', m.map((result, idx) => `\t\t${idx} ${result.url} ("${result.query}", ${result.provider})`).join('\n')));

query.connect();
res.connect();
mix.connect();
