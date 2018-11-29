import getCredentialManager from 'anonymous-credentials/lib/wasm';
import makeWorker from './worker-common';

makeWorker(self, getCredentialManager);
