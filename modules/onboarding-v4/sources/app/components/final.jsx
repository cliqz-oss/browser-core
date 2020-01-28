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
      this.props.finalComponentDidUpdate();
    }
  }

  getClassName() {
    const infoBlockClass = this.props.visible ? 'info-block' : 'info-block-hidden';
    return `final ${infoBlockClass}`;
  }

  render() {
    return (
      <div className={this.getClassName()}>
        <div className="info-block-content final-block-content">
          <div className="info-headline final-headline">
            {t('enjoy_cliqz')}
          </div>
        </div>
      </div>
    );
  }
}
