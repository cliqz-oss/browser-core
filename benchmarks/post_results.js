const fs = require('fs');
const client = require('prom-client');
const gateway = new client.Pushgateway('http://pushgateway-ddns.cliqz.discover:9091');

const testNames = [
  'new_profile',
  'startup',
  'wr_antitracking',
  'wr_adblocker',
  'wr_base'
];
const labelNames = ['config', 'branch', 'benchmark', 'commit']
const metrics = {
  cputime: new client.Gauge({
    name: 'extension_benchmark_cputime',
    help: 'CPU time taken for a benchmark.',
    labelNames,
  }),
  idb: new client.Gauge({
    name: 'extension_benchmark_idb',
    help: 'Size of indexedDB databases after benchmark (bytes).',
    labelNames,
  }),
  memory: new client.Gauge({
    name: 'extension_benchmark_memory',
    help: 'Average memory usage during benchmark (bytes).',
    labelNames,
  }),
  httpRequests: new client.Gauge({
    name: 'extension_benchmark_httpRequests',
    help: 'Number of outgoing HTTP requests during benchmark.',
    labelNames,
  }),
  networkData: new client.Gauge({
    name: 'extension_benchmark_networkData',
    help: 'Amount of data downloaded during benchmark (bytes).',
    labelNames,
  }),
  contentMessages: new client.Gauge({
    name: 'extension_benchmark_contentMessages',
    help: 'Number of messages sent to the content-script during the benchmark.',
    labelNames,
  }),
  runtimeMessagesResponded: new client.Gauge({
    name: 'extension_benchmark_runtimeMessagesResponded',
    help: 'Number of messages from content-script that the extension replied to.',
    labelNames,
  }),
  storage: new client.Gauge({
    name: 'extension_benchmark_storage',
    help: 'Size of chrome.storage after benchmark (bytes).',
    labelNames,
  }),
  storageWrites: new client.Gauge({
    name: 'extension_benchmark_storageWrites',
    help: 'Number of times chrome.storage was written to during the benchmark.',
    labelNames,
  }),
}

const results = fs.readFileSync(0).toString().split('\n').filter(l => l.startsWith('{')).map(JSON.parse);
const config = process.env.CLIQZ_CONFIG_PATH
const commit = process.argv[2];
results.forEach((res, i) => {
  Object.keys(res).forEach((k) => {
    metrics[k].set({
      config,
      branch: process.env.BRANCH_NAME,
      commit,
      benchmark: testNames[i],
    }, res[k])
  });
});

gateway.pushAdd({ jobName: 'jenkins-benchmark' }, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('metrics pushed');
});
