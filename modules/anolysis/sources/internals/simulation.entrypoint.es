/* eslint-disable import/no-extraneous-dependencies */
import express from '../../platform/lib/express';
import bodyParser from '../../platform/lib/body-parser';
import compression from '../../platform/lib/compression';

import prefs from '../../core/prefs';
import console from '../../core/console';

import Anolysis from './anolysis';
import Config from './config';
import Storage from './storage/memory';
import telemetrySchemas from '../telemetry-schemas';

function log(...args) {
  console.log('[nodejs]', ...args);
}

function waitForAsync(fn) {
  return fn()
    .then((value) => {
      if (value) {
        return Promise.resolve();
      }
      return Promise.reject();
    })
    .catch(() => new Promise((resolve) => {
      setTimeout(
        () => {
          resolve(waitForAsync(fn));
        },
        1000,
      );
    }));
}

const clients = new Map();
let availableDefinitions = null;

// Create express app to communicate with Python process
const port = 8242;
const app = express();

app.use(bodyParser.json({
  limit: '1000MB',
}));
app.use(compression());

app.post('/', (req, res) => {
  const { date, users } = req.body;
  log('Simulate new day:', date);

  // Change global config_ts
  prefs.set('config_ts', date);

  const promises = Object.keys(users).map((uid) => {
    const demographics = users[uid];

    // Lazily create a new instance of Anolysis if there is none yet for this uid
    let promise = Promise.resolve(clients.get(uid));
    if (!clients.has(uid)) {
      // log('Create new client', uid, `(total: ${clients.size})`);
      const newClient = new Anolysis(new Config({
        // Use local server
        'backend.url': 'http://localhost:8342',

        // Speed-up signal queue
        'signalQueue.batchSize': 100,
        'signalQueue.sendInterval': 15,
        'signalQueue.maxAttempts': 1,

        // Inject demographics
        demographics,

        // Use in-memory storage
        Storage,
      }));

      // Cache available definitions to limit memory consumption
      if (availableDefinitions === null) {
        newClient.registerSignalDefinitions(telemetrySchemas);
        availableDefinitions = newClient.availableDefinitions;
      } else {
        newClient.availableDefinitions = availableDefinitions;
      }

      clients.set(uid, newClient);
      promise = newClient.init().then(() => newClient);
    }

    // TODO - [optional] Inject telemetry signals
    return promise.then(client =>
      client.onNewDay(date)
        .then(() => waitForAsync(() => client.signalQueue.getSize().then(s => s === 0)))
        .catch(err => log('Error in client', uid, err)));
  });

  Promise.all(promises)
    .catch(err => log('Error while processing day', err))
    .then(() => {
      res.end('{}');
    });
});

const server = app.listen(port, () => {
  const host = server.address().address;
  log(`Anolysis simulation clients listening at: http://${host}:${port}`);

  // Set timeout to a high value
  server.setTimeout(1000 * 60 * 60);
});
