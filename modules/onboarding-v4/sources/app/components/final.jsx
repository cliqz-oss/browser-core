/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default class Final extends React.Component {
  componentDidUpdate() {
    if (this.props.visible) {
      this.props.removeOnTabChangedListener();
      this.updatePrefs();
      setTimeout(this.props.updateStep, 1100);
    }
  }

  get headline() {
    return this.allToggled
      ? t('protection_full_headline')
      : t('protection_partial_headline');
  }

  get allToggled() {
    return this.props.stepsState.filter(step => step.enabled === true).length === 3;
  }

  updatePrefs = () => {
    const prefs = [];
    this.props.stepsState.forEach(async (step) => {
      if (step.name === 'antiphishing') {
        prefs.push({ name: 'cliqz-anti-phishing-enabled', value: step.enabled });
      }
      if (step.name === 'adblocking') {
        prefs.push({ name: 'cliqz-adb', value: step.enabled });
      }
      if (step.name === 'antitracking') {
        prefs.push({ name: 'modules.antitracking.enabled', value: step.enabled });
      }
      await this.props.cliqz.setPrefs(prefs);
    });
  }

  render() {
    return (
      <div
        className={`step final ${this.props.visible ? 'show' : ''}`}
      >
        <div className="info">
          <div className="headline">
            {this.headline}
          </div>
          <div className="check" />
        </div>
      </div>
    );
  }
}
