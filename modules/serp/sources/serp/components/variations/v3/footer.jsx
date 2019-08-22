/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default () => (
  <div className="footer footer-v3">
    <div className="footer-about footer-v3-about">
      <a href="https://cliqz.de">© 2018 Cliqz</a>
      <a href="https://cliqz.de/download">Produkte</a>
      <a href="https://cliqz.com/legal">Impressum</a>
      <a href="https://cliqz.com/privacy-browser">Datenschutzerklärung</a>
    </div>
    <div className="footer-v3-partners">
      <a href="https://whotracks.me" className="footer-v3-partners-who-tracks-me">Who tracks me</a>
      <a href="https://ghostery.com" className="footer-v3-partners-ghostery">Ghostery</a>
      <span className="footer-v3-partners-made-in-germany" />
    </div>
  </div>
);
