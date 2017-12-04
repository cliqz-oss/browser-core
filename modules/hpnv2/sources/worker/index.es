const console = {
  log: (...args) => self.postMessage({ logMessage: { type: 'log', args } }),
  error: (...args) => self.postMessage({ logMessage: { type: 'error', args } })
};

let manager;
try {
  if (typeof WebAssembly !== 'undefined') {
    importScripts('group-signer-bundle-wasm.js');
    manager = new self.GroupSignManager();
  }
} catch (e) {
  console.error('[hpnv2-worker] Error loading wasm bundle', e);
}

if (!manager) {
  try {
    importScripts('group-signer-bundle-asmjs.js');
    manager = new self.GroupSignManager();
  } catch (e) {
    console.error('[hpnv2-worker] Error loading asmjs bundle', e);
  }
}

self.onmessage = ({ data: { id, fn, args } }) => {
  const now = performance.now();
  Promise.resolve()
    .then(() => manager[fn](...args))
    .then((data) => {
      console.log('[hpnv2-worker]', fn, performance.now() - now, 'ms');
      self.postMessage({ id, data });
    })
    .catch((error) => {
      console.error('[hpnv2-worker]', error);
      self.postMessage({ id, error: `Worker error: '${error}', stack: <<< ${error && error.stack} >>>` });
    });
};
