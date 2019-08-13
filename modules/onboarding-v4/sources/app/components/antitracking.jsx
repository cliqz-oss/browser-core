import React from 'react';
import Eyes from './eyes';
import Tooltip from './tooltip';
import Info from './info';
import cliqz from '../../cliqz';
import t from '../../i18n';

import { trackingInfoClick } from '../services/telemetry/telemetry';

export default class Antitracking extends React.Component {
  state = {
    // initial positions of the eyes; eye width and height = 55; distance between eyes = 32;
    eyesPositions: [
      {
        top: 100 - 55,
        left: 600 - 55 / 2 - 32 - 55,
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
    ],
  }

  handleMouseMove = (event) => {
    // implementation was taken from here: https://codepen.io/J-Roel/pen/wWGNQN

    const pageX = event.pageX;
    const pageY = event.pageY;
    const eyesHalfWidth = 71;
    const eyesHalfHeight = 22.5;

    this.setState((prevState) => {
      const eyesPositions = prevState.eyesPositions;
      for (let i = 0; i < eyesPositions.length; i += 1) {
        const x = eyesPositions[i].left
          ? eyesPositions[i].left + eyesHalfWidth
          : window.innerWidth - eyesPositions[i].right - eyesHalfWidth;
        const y = eyesPositions[i].top
          ? eyesPositions[i].top + eyesHalfHeight
          : window.innerHeight - eyesPositions[i].bottom - eyesHalfHeight;
        const rad = Math.atan2(pageX - x, pageY - y);
        const angle = (rad * (180 / Math.PI) * -1) + 180;
        eyesPositions[i].angle = angle;
      }
      return eyesPositions;
    });
  }

  openLearnMoreLink = () => {
    this.props.removeBlurListener();
    trackingInfoClick();
    cliqz.onboarding.openLink('https://cliqz.com/whycliqz/anti-tracking');
  }

  get description() {
    return this.props.stepState.enabled
      ? t('antitracking_toggle_on')
      : t('antitracking_toggle_off');
  }

  get tooltip() {
    return !this.props.stepState.enabled
      ? (
        <Tooltip
          headline={t('antitracking_tooltip_headline')}
          learnMoreText={t('antitracking_tooltip_learn_more')}
          openLearnMoreLink={this.openLearnMoreLink}
          text={t('antitracking_tooltip_text')}
        />
      )
      : false;
  }

  render() {
    return (
      <div
        className={`step antitracking ${this.props.visible ? 'show' : ''}`}
        onMouseMove={this.handleMouseMove}
      >
        {this.props.visible && (
          <React.Fragment>
            <Info
              description={this.description}
              headline={t('antitracking_headline')}
              isToggled={this.props.stepState.enabled}
              onToggle={this.props.onToggle}
              tooltip={this.tooltip}
            />
            <Eyes
              eyesPositions={this.state.eyesPositions}
              isToggled={this.props.stepState.enabled}
            />
          </React.Fragment>
        )}
      </div>
    );
  }
}
