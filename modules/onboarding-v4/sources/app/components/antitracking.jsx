/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import t from '../../i18n';

export default class Antitracking extends React.Component {
  getClassName() {
    const infoBlockClass = this.props.visible ? 'info-block' : 'info-block-hidden';
    const mainClass = this.props.stepState.enabled ? 'antitracking-toggled' : 'antitracking';
    return `${infoBlockClass} ${mainClass}`;
  }

  getHeader() {
    return t('antitracking_header');
  }

  getDescription() {
    const keyToken = this.props.stepState.enabled
      ? 'antitracking_description_on'
      : 'antitracking_description_off';

    return (
      <div className="info-headline antitracking-headline">
        <p>{t(`${keyToken}_1`)}</p>
        <p>{t(`${keyToken}_2`)}</p>
      </div>
    );
  }

  getStatus() {
    return this.props.stepState.enabled ? t('status_on') : t('status_off');
  }

  getStatusClass() {
    return this.props.stepState.enabled
      ? 'info-block-ctrl-toggled'
      : 'info-block-ctrl-status';
  }

  render() {
    return (
      <div className={this.getClassName()} onMouseMove={this.handleMouseMove}>
        <div className="info-block-content">
          {this.getDescription()}
        </div>
        <div className="info-block-ctrl">
          <span className="info-block-ctrl-content antitracking-ctrl-content">
            {this.getHeader()}
          </span>
          <span className={this.getStatusClass()}>
            {this.getStatus()}
          </span>
          <label className="info-block-ctrl-switch switch">
            <input
              checked={this.props.stepState.enabled}
              className="toggle"
              onChange={this.props.onToggle}
              type="checkbox"
            />
            <span className="slider" />
          </label>
        </div>
      </div>
    );
  }
}
