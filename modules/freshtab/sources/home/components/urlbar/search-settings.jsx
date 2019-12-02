/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

const src = '../control-center/index.html?pageAction=true&compactView=true';

export default class SearchSettings extends React.Component {
  async componentDidUpdate(prevProps) {
    if (!prevProps.isOpen && this.props.isOpen) {
      const controlCenter = this.iframe.contentWindow.document.getElementById('control-center');
      controlCenter.style.width = 'auto';
      controlCenter.querySelector('.footer').style.width = 'auto';
      this.iframe.style.height = `${Math.min(controlCenter.scrollHeight, this.props.maxHeight)}px`;
    }
  }

  render() {
    return (
      <div>
        <div
          className="settings-panel"
        >
          <iframe
            id="cliqz-control-center-iframe"
            tabIndex="-1"
            title="Settings"
            src={src}
            ref={(iframe) => { this.iframe = iframe; }}
          />
        </div>
      </div>
    );
  }
}
