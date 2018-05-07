const console = {
  log: (...args) => self.postMessage({ logMessage: { type: 'log', args } }),
  error: (...args) => self.postMessage({ logMessage: { type: 'error', args } })
};

function wrapError(e) {
  return `Worker error: '${e && e.message}', stack: <<< ${e && e.stack} >>>`;
}

const buildType = typeof WebAssembly !== 'undefined' ? 'wasm' : 'asmjs';
let loadPromise = Promise.reject(new Error('hpnv2-worker not initialized'));
try {
  importScripts(`group-signer-bundle-${buildType}.js`);
  loadPromise = self.Module.getGroupSigner().then(GroupSigner => new GroupSigner());
} catch (e) {
  console.error('[hpnv2-worker]', 'importScripts error', wrapError(e));
}

self.onmessage = ({ data: { id, fn, args } }) => {
  const now = performance.now();
  loadPromise
    .then(manager => (fn === 'init' ? {} : manager[fn](...args)))
    .then((data) => {
      console.log('[hpnv2-worker]', fn, performance.now() - now, 'ms');
      self.postMessage({ id, data });
    })
    .catch((e) => {
      const error = wrapError(e);
      console.error('[hpnv2-worker]', error);
      self.postMessage({ id, error });
    });
};
