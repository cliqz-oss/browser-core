/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import cliqz from '../../cliqz';
import t from '../../i18n';

import * as telemetry from '../services/telemetry/telemetry';
import config from '../../../core/config';

export default class PopupControlCenter extends React.Component {
  _timerId = null

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

      // Here is why we need this setTimeout.
      // Since this step is the last one (it shows notification under CC icon)
      // the extension might be updating meanwhile.
      // If that happened then the notification would be closed even though
      // it was initiated via experimental API.
      // That behaviour would lead to situation when it would be impossible to
      // see the freshtab there, that is, to close blurred background.
      // 4 seconds should be enough for a user to make a decision whether to open
      // Control Center or do it later from the freshtab.
      // 10 divisible numbers scare me sometimes.
      // So I decided to put 3999 until people convinced me to replace it for 4000
      this._timerId = setTimeout(() => {
        this.finishOnboarding();
      }, 4000);

      telemetry.popupCCshow();

      const promise = cliqz.onboarding.showUITour(settings, tryButton, skipButton);

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
    clearTimeout(this._timerId);
    this._timerId = null;

    cliqz.onboarding.hideUITour();
    // change tab name
    parent.document.title = config.settings.FRESHTAB_TITLE;
    // remove iframe with onboarding
    const iframe = parent.document.querySelector('iframe#onboarding');
    iframe.parentNode.removeChild(iframe);
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
