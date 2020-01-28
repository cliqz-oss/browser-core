/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const EYES_HALF_WIDTH = 71;
const EYES_HALF_HEIGHT = 22.5;

// initial positions of the eyes; eye width and height = 55; distance between eyes = 32;
// This array is mutable;
// As new values of a mouse cursor potision arrive the array will be recalculated;
const EYES_POSITIONS = [
  {
    top: 100 - 55,
    left: 555 - 55 / 2 - 32 - 55,
    angle: 0,
  },
  {
    top: 400 - 55,
    left: 170 - 55 / 2 - 32 - 55,
    angle: 0,
  },
  {
    top: 180 - 55,
    right: 150 - 55 / 2,
    angle: 0,
  },
  {
    bottom: 35,
    left: 250 - 55 / 2 - 32 - 55,
    angle: 0,
  },
  {
    bottom: 210,
    left: 530 - 55 / 2 - 32 - 55,
    angle: 0,
  },
  {
    bottom: 240,
    right: 350 - 55 / 2,
    angle: 0,
  },
  {
    bottom: 50,
    right: 120 - 55 / 2,
    angle: 0,
  },
];

const calculateEyesPosition = ({ pageX, pageY }) => {
  if (pageX === pageY && pageX === -1) {
    return;
  }

  // implementation was taken from here: https://codepen.io/J-Roel/pen/wWGNQN
  for (let i = 0; i < EYES_POSITIONS.length; i += 1) {
    const x = EYES_POSITIONS[i].left
      ? EYES_POSITIONS[i].left + EYES_HALF_WIDTH
      : window.innerWidth - EYES_POSITIONS[i].right - EYES_HALF_WIDTH;
    const y = EYES_POSITIONS[i].top
      ? EYES_POSITIONS[i].top + EYES_HALF_HEIGHT
      : window.innerHeight - EYES_POSITIONS[i].bottom - EYES_HALF_HEIGHT;
    const rad = Math.atan2(pageX - x, pageY - y);
    const angle = (rad * (180 / Math.PI) * -1) + 180;
    EYES_POSITIONS[i].angle = angle;
  }
};

const generateKey = eyesPosition => `${eyesPosition.top}-${eyesPosition.right}-${eyesPosition.bottom}-${eyesPosition.left}`;

const getClassName = visible => (visible ? 'antitracking-layout visible' : 'antitracking-layout');

export default class AntitrackingLayout extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      pageX: -1,
      pageY: -1
    };
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleLayoutMouseMove);
  }

  componentDidUpdate() {
    document.removeEventListener('mousemove', this.handleLayoutMouseMove);

    if (!this.props.visible) {
      return;
    }

    if (!this.props.isToggled) {
      document.addEventListener('mousemove', this.handleLayoutMouseMove);
    }
  }

  handleLayoutMouseMove = (event) => {
    this.setState({
      pageX: event.pageX,
      pageY: event.pageY,
    });
  }

  render() {
    const { visible, isToggled } = this.props;
    const { pageX, pageY } = this.state;

    calculateEyesPosition({ pageX, pageY });

    return (
      <div className={getClassName(visible)}>
        {EYES_POSITIONS.map(eyesPosition => (
          <div
            key={generateKey(eyesPosition)}
            className={`eyes ${isToggled ? 'closed' : ''} `}
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
