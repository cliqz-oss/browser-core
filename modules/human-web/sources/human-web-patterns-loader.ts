/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { isEdge } from '../core/platform';
import {
  RemoteResourceWatcher,
  ResourceUpdatedCallback
} from './remote-resource-watcher';
import SignatureVerifier from './signature-verifier';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * List of keys that the clients will trust. Normally, there is no
 * reason to have multiples keys except to improve compatibility
 * with platforms that do not support the prefered signing algorithm.
 */
const trustedSigningKeys = {
  '2019-10-24-human-web.pub': {
    algorithm: 'RSA-PSS',
    pem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzl+p69u7jxhcnCiAZdfB
8gBYIceOK58sgyFiyodyG8scAZHZ2+YPbKUdLzvMXsY2bLDkJesOCWFuYtsnqQU5
EM/yyV0TgP4DnHMGf3GTuNAFKfa3bUwe6FhN8nJ9P1O6MpFTpVmWWz/NK/3wul2+
o3aTc5mjhUxUZNwlKm6quIlK+cBF8q+ShuLIvM8VrMn30jAtZ1QF+QF0jTNdA4v9
SUX7subnmCLtJNkZRsCkVqni2Uza2dN8vdaqsRXQ22nzuP0m+uRxrN+ORGGRnqaW
ZpJDPOb9RzbPMOawfjPhkayRb9yvU0f6pLvKm6kmKLsoblsaeLFbhu1igO8nXP4X
6wIDAQAB
-----END PUBLIC KEY-----`,
  },

  // fallback for Edge
  '2019-10-24-human-web-edge.pub': {
    algorithm: 'RSASSA-PKCS1-v1_5',
    pem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxA5Sb+mcJ23TJGHL7dH0
bhPa1SHC3+SyAfbLsy7WNAihpErzo7q9w1R12f00Xn3afn6kbRxfw7S/aMzHc5vb
okwnyDc1Y1pk+tJXRyJPHkhTAEwU6HsQb9PPC/8zXPW2wOK5RxnaaxjMhZ1gvYqF
cnicmQ0Yv5oPy1orIaQLYLaqvUmVbLip9YLKOOrLJezr0OxgOxvr2LTNljz1n5H/
W+23gWXgLLg8eDAV0qR/GjStHBc2CS0nk0+Aq3Nocom/TE3ddAcIxNyq3we19HEB
Ara+5KbkEK1XE2WS+A/56AViOjOMUtXvX3hEXIxdbDRmm1ycj5wnqZWtN770hs3N
wQIDAQAB
-----END PUBLIC KEY-----`,
  },
};

/**
 * Loads content extraction patterns from the Cliqz backend.
 * For instance, these pattern define rules to recognize
 * queries from search engine result pages.
 * To keep in sync with the backend, the client will regularly
 * poll for changes.
 *
 * If the initial loading of the pattern fails because the network
 * is not available, human web will start in a well-defined state
 * but some functionality will be disabled until the patterns could
 * be successfully fetched from the server.
 *
 * Well-defined state means that no patterns will be active.
 * In other words, there should be no errors, but at the same
 * time no content will be collected. Once the patterns are
 * loaded, full functionality of human web will be restored.
 */
export default class SignedPatternsLoader {
  verifier: SignatureVerifier;
  resourceWatcher: RemoteResourceWatcher;

  constructor(url: string, onUpdate: ResourceUpdatedCallback) {
    const publicKeyName =
      isEdge ? '2019-10-24-human-web-edge.pub' : '2019-10-24-human-web.pub';
    const { algorithm, pem } = trustedSigningKeys[publicKeyName];

    this.verifier = new SignatureVerifier({
      resourceUrl: url,
      publicKeyName,
      algorithm,
      publicKeyPem: pem,
      insecure: false,
    });

    this.resourceWatcher = new RemoteResourceWatcher({
      moduleName: 'human-web',
      resource: {
        id: 'human-web-patterns',
        url,
      },
      signature: {
        url: this.verifier.signatureUrl,
        verifier: this.verifier,
      },
      caching: {
        maxAge: 1 * HOUR,
      },
      onUpdate,
      uncompressWith: 'gzip',
    });
  }

  async init() {
    // Fail fast if there is a problem with loading the public key.
    // There is no way to recover except by disabling signature
    // checking (by setting the 'insecure' flag), or switching to
    // alternative crypto algorithms.
    await this.verifier.ensureKeysAreLoaded();

    await this.resourceWatcher.init();
  }

  async unload() {
    this.resourceWatcher.unload();
  }
}
