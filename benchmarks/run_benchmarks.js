/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const childProcess = require('child_process');

function runBenchmark(script, sessionFile) {
  const benchProcess = childProcess.spawnSync('time', ['-p', 'node', '--expose-gc', script, sessionFile]);
  const stderr = benchProcess.stderr.toString().split('\n');
  try {
    const results = JSON.parse(benchProcess.stdout.toString());
    const cputime = parseFloat(stderr[stderr.length - 3].split(/[ ]+/)[1]);
    return {
      results: { cputime, ...results },
      errors: stderr,
    }
  } catch (e) {
    console.error(benchProcess.stderr.toString());
    process.exit(1);
  }
}

const prefFile = './data/storage/storage_local.json';
const startingPrefs = {
  'cliqz-adb': 1,
};

function setCliqzPref(name, value) {
  const prefs = JSON.parse(fs.readFileSync(prefFile));
  prefs.cliqzprefs[name] = value;
  fs.writeFileSync(prefFile, JSON.stringify(prefs));
}

function resetStorage(initialPrefs) {
  if (fs.existsSync('./data')) {
    childProcess.spawnSync('rm', ['-r', './data']);
  }
  fs.mkdirSync('./data');
  fs.mkdirSync('./data/storage');
  // auto-select adblocker enabled
  fs.writeFileSync(prefFile, JSON.stringify({
    cliqzprefs: initialPrefs
  }));
}

resetStorage(startingPrefs);
const results = [];

function logResult(result) {
  console.log(JSON.stringify(result.results));
}

console.log('=== Startup benchmark: New profile ===');
results.push(runBenchmark('./startup.js'));
logResult(results[0]);

console.log('=== Startup benchmark: Existing profile ===');
results.push(runBenchmark('./startup.js'));
logResult(results[1]);

// webrequest benchmark
resetStorage(startingPrefs);
console.log('=== Webrequest Benchmark: All ===');
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[2]);

// with offers off
console.log('=== Webrequest Benchmark: Offers off ===');
resetStorage({
  'modules.offers-v2.enabled': false,
  ...startingPrefs,
});
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[3]);

// with anti-tracking off
console.log('=== Webrequest Benchmark: Anti-tracking off ===');
resetStorage({
  'modules.offers-v2.enabled': false,
  'modules.antitracking.enabled': false,
  'modules.antitracking-blocker.enabled': false,
  ...startingPrefs,
});
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[4]);

console.log('=== Webrequest Benchmark: Both off ===');
resetStorage({
  'modules.offers-v2.enabled': false,
  'modules.antitracking.enabled': false,
  'modules.antitracking-blocker.enabled': false,
  'cliqz-adb': 0,
});
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[5]);
