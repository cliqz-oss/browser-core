/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable import/no-extraneous-dependencies */
import express from '../../platform/lib/express';
import bodyParser from '../../platform/lib/body-parser';

import prefs from '../../core/prefs';
import console from '../../core/console';
import { waitFor } from '../../core/wait';

import Anolysis from './anolysis';
import createConfig from './config';
import Storage from './storage/memory';

function log(...args) {
  console.log('[nodejs]', ...args);
}

const clients = new Map();

// Create express app to communicate with Python process
const port = parseInt(process.argv[2], 10);
const app = express();

app.use(bodyParser.json({
  limit: '1000MB',
}));

app.post('/', async (req, res) => {
  const { date, users } = req.body;
  log('Simulate new day:', date);

  // Change global config_ts
  prefs.set('config_ts', date);

  const promises = Object.keys(users).map(async (uid) => {
    const demographics = users[uid];

    // Lazily create a new instance of Anolysis if there is none yet for this uid
    let client = clients.get(uid);
    if (!clients.has(uid)) {
      // log('Create new client', uid, `(total: ${clients.size})`);
      client = new Anolysis(await createConfig({
        // Use local server
        'backend.url': 'http://localhost:8342',
        useStaging: true,

        // Speed-up signal queue
        'signalQueue.batchSize': 1000,
        'signalQueue.sendInterval': 100000000,
        'signalQueue.maxAttempts': 1,

        // Inject demographics
        demographics,

        // Use in-memory storage
        Storage,
      }));

      clients.set(uid, client);
      await client.init();
    }

    // Trigger sending of signals for this day
    try {
      await client.onNewDay(date);
      await client.signalQueue.processNextBatch(1000);
      await waitFor(async () => (await client.signalQueue.getSize()) === 0);
    } catch (ex) {
      log('Error in client', uid, ex);
    }
  });

  try {
    await Promise.all(promises);
  } catch (ex) {
    log('Error while processing day', ex);
  }

  res.end('{}');
});

const server = app.listen(port, () => {
  const host = server.address().address;
  log(`Anolysis simulation clients listening at: http://${host}:${port}`);

  // Set timeout to a high value
  server.setTimeout(1000 * 60 * 60);
});
