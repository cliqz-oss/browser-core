const readline = require('readline');
const { performance } = require('perf_hooks');
const { URL } = require('url');

// build with node-bench config
const coreUrl = require('../build/core/url');
const urlInfo = require('../build/core/url-info');
const tlds = require('../build/core/tlds');

// collect set of urls to test
const lineReader = readline.createInterface({
  input: process.stdin,
});

const urls = []
lineReader.on('line', (line) => {
  const url = JSON.parse(line).url;
  urls.push(url);
});

function test(fn, repeats = 1) {
  const start = performance.now();
  for (let r = 0; r < repeats; r += 1) {
    for (let i = 0; i < urls.length; i += 1) {
      fn(urls[i]);
    }
  }
  return performance.now() - start;
}

lineReader.on('close', () => {
  console.log('getDetailsFromUrl', test(coreUrl.getDetailsFromUrl));
  console.log('UrlInfo', test(urlInfo.URLInfo.get));
  console.log('URL', test(u => new URL(u)));
  console.log('tldts', test(tlds.parse));
  console.log('UrlInfo: domain extract', test((u) => {
    const info = urlInfo.URLInfo.get(u);
    info.generalDomain;
  }));
  console.log('UrlInfo: parameter extract', test((u) => {
    const info = urlInfo.URLInfo.get(u);
    info.extractKeyValues();
  }));
});
