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

function setCliqzPref(name, value) {
  const prefs = JSON.parse(fs.readFileSync(prefFile));
  prefs.cliqzprefs[name] = value;
  fs.writeFileSync(prefFile, JSON.stringify(prefs));
}

if (fs.existsSync('./data')) {
  childProcess.spawnSync('rm', ['-r', './data']);
}
fs.mkdirSync('./data');
fs.mkdirSync('./data/storage');
// auto-select adblocker enabled
fs.writeFileSync(prefFile, JSON.stringify({ cliqzprefs: { 'cliqz-adb': 1 }}));

const results = [];

function logResult(result) {
  console.log(JSON.stringify(result.results));
}

console.log('=== Startup benchmark: New profile ===');
results.push(runBenchmark('./startup.js'));
logResult(results[0])

console.log('=== Startup benchmark: Existing profile ===');
results.push(runBenchmark('./startup.js'));
logResult(results[1])

// webrequest benchmark
console.log('=== Webrequest Benchmark: Anti-tracking + adblocker ===');
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[2])

// with anti-tracking off
console.log('=== Webrequest Benchmark: Anti-tracking off ===');
setCliqzPref('modules.antitracking.enabled', false);
setCliqzPref('modules.antitracking-blocker.enabled', false);
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[3])

console.log('=== Webrequest Benchmark: Both off ===');
setCliqzPref('cliqz-adb', 0);
results.push(runBenchmark('./webrequest_benchmark.js', 'requests.jl'));
logResult(results[4])
