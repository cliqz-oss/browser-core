/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

export default class Eyes extends React.Component {
  componentDidMount() {
    setTimeout(() => {
      const eyesContainer = document.querySelector('.eyes-container');
      if (eyesContainer) {
        if (eyesContainer.classList.contains('visible')) {
          return;
        }
        eyesContainer.classList += ' visible';
      }
    }, 3000);
  }

  generateKey = eyesPosition => `${eyesPosition.top}-${eyesPosition.right}-${eyesPosition.bottom}-${eyesPosition.left}`

  render() {
    return (
      <div className="eyes-container">
        {this.props.eyesPositions.map(eyesPosition => (
          <div
            key={this.generateKey(eyesPosition)}
            className={`eyes ${this.props.isToggled ? 'closed' : ''} `}
            style={{
              top: eyesPosition.top,
              left: eyesPosition.left,
              right: eyesPosition.right,
              bottom: eyesPosition.bottom,
            }}
          >
            <span style={{ transform: `rotate(${eyesPosition.angle}deg)` }} />
            <span style={{ transform: `rotate(${eyesPosition.angle}deg)` }} />
          </div>
        ))}
      </div>
    );
  }
}
