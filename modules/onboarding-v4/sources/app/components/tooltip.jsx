/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default function Tooltip({
  headline,
  learnMoreText,
  openLearnMoreLink,
  text,
}) {
  return (
    <div className="tooltip">
      <div className="tooltip-headline">{headline}</div>
      <div className="tooltip-description">{text}</div>
      <div className="tooltip-learn-more">
        <button className="tooltip-learn-more-btn" type="button" onClick={openLearnMoreLink}>{learnMoreText}</button>
      </div>
    </div>
  );
}
