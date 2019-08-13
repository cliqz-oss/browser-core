import React from 'react';
import cliqz from '../../cliqz';
import t from '../../i18n';

import * as telemetry from '../services/telemetry/telemetry';

import {
  showUITour,
  hideUITour,
} from '../../../core/ui-tour';


export default class PopupControlCenter extends React.Component {
  componentDidUpdate() {
    if (this.props.visible) {
      const settings = {
        targetId: 'onboarding-v4',
        text: t('popup_explanation'),
        icon: '',
      };

      const tryButton = {
        label: t('popup_button_try'),
        style: 'primary'
      };

      const skipButton = {
        label: t('popup_button_skip'),
        style: 'link'
      };

      telemetry.popupCCshow();

      const promise = showUITour(settings, tryButton, skipButton);

      promise.then(async (button) => {
        switch (button) {
          case 'CTA': {
            telemetry.popupCCTryNow();
            this.finishOnboarding();
            cliqz.onboarding.openControlCenter();
            break;
          }

          case 'skip': {
            telemetry.popupCCSkip();
            this.finishOnboarding();
            break;
          }

          case 'close': {
            telemetry.popupCCClose();
            this.finishOnboarding();
            break;
          }

          default: {
            // do nothing
          }
        }
      });
    }
  }

  finishOnboarding = () => {
    hideUITour();
    this.props.finishOnboarding();
  }

  render() {
    const { visible } = this.props;
    return (
      visible && (
        <div
          className={`step popup-cc ${visible ? 'show' : ''}`}
          onClick={this.finishOnboarding}
          role="button"
          tabIndex="0"
        />
      )
    );
  }
}
