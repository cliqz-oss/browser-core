/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import Info from './info';
import t from '../../i18n';

const AD_SIZE_RATIOS = [0.9, 1.1, 1, 1.2];

const AD_BACKGROUNDS = [
  '#989798', // grey
  '#ff7f75', // orange
  '#ffd500', // yellow
  '#930096', // purple
  '#ed3323 url("./images/yt1.png") center right/90% no-repeat',
];

const AD_POSITIONS = [
  { top: '-2vh', left: '-5vw' },
  { top: '65vh', left: '20vw' },
  { top: '68vh', left: '85vw' },
  { top: '88vh', left: '80vw' },
  { top: '5vh', left: '75vw' },
  { top: '-5vh', left: '63vw' },
  { top: '35vh', left: '55vw' },
  { top: '90vh', left: '50vw' },
  { top: '15vh', left: '90vw' },
  { top: '-3vh', left: '25vw' },
  { top: '80vh', left: '-5vw' },
  { top: '83vh', left: '58vw' },
  { top: '10vh', left: '53vw' },
  { top: '40vh', left: '30vw' },
  { top: '30vh', left: '70vw' },
  { top: '85vh', left: '25vw' },
  { top: '8vh', left: '5vw' },
  { top: '95vh', left: '90vw' },
  { top: '55vh', left: '48vw' },
];

const STATIC_ADS = [
  { className: 'static', style: { width: '200px', height: '150px', background: '#989798', top: '20vh', left: '10vw', zIndex: 3 } },
  { className: 'static', style: { width: '200px', height: '150px', background: '#ffd500', top: '25vh', left: '2vw', zIndex: 4 } },
  { className: 'static', style: { width: '200px', height: '150px', background: '#ed3323 url("./images/yt1.png") center right/90% no-repeat', top: '35vh', left: '7vw', zIndex: 3 } },
];

const createAnimatedAds = () => {
  const ads = [];
  for (let i = 0; i < AD_POSITIONS.length; i += 1) {
    ads.push({
      className: 'move',
      style: {
        width: `${200 * AD_SIZE_RATIOS[i % AD_SIZE_RATIOS.length]}px`,
        height: `${150 * AD_SIZE_RATIOS[i % AD_SIZE_RATIOS.length]}px`,
        background: `${AD_BACKGROUNDS[i % AD_BACKGROUNDS.length]}`,
        animation: `showAd 1s forwards ${(i + 1) * 0.8}s`,
        top: AD_POSITIONS[i % AD_POSITIONS.length].top,
        left: AD_POSITIONS[i % AD_POSITIONS.length].left,
        zIndex: 1,
      }
    });
  }
  return ads;
};

export default class Adblocking extends React.Component {
  state = {
    animationClass: '',
  }

  renderAdBoxes = () => {
    const ads = createAnimatedAds().concat(STATIC_ADS);
    return (
      <div className={`background ${this.state.animationClass}`}>
        {
          ads.map(ad => (
            <div
              className={`ad ${ad.className}`}
              key={`${ad.style.top}${ad.style.left}`}
              style={ad.style}
            />
          ))
        }
      </div>
    );
  };

  handleBgToggle = (isToggled) => {
    const animationClass = !isToggled || 'not-animated';
    this.setState({ animationClass });
  };

  get description() {
    return this.props.stepState.enabled
      ? t('adblocking_toggle_on')
      : t('adblocking_toggle_off');
  }

  render() {
    const { onToggle, visible } = this.props;
    return (
      <div className={`step adblocking ${visible ? 'show' : ''}`}>
        {visible && (
          <React.Fragment>
            <Info
              description={this.description}
              handleBgToggle={this.handleBgToggle}
              headline={t('adblocking_headline')}
              isToggled={this.props.stepState.enabled}
              onToggle={onToggle}
            />
            {this.renderAdBoxes()}
          </React.Fragment>
        )}
      </div>
    );
  }
}
