import getCredentialManager from 'anonymous-credentials/lib/asmjs';
import makeWorker from './worker-common';

makeWorker(self, getCredentialManager);
