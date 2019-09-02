/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import classNames from 'classnames';

export default (props = {}) => {
  const items = props.items || [];
  const onItemSelected = typeof props.onItemSelected === 'function'
    ? props.onItemSelected
    : () => {};

  return (
    <div
      className="dropdown"
    >
      <div
        className="dropdown-header"
      >
        {props.headerText || ''}
      </div>
      <div
        className="dropdown-options"
      >
        {
          items.map((item, index) => {
            const cssClass = {
              'dropdown-option': true,
              'dropdown-option-checked': item.checked,
            };
            cssClass[item.cssClass] = !!item.cssClass;

            return (
              <a
                href={`#${item.title}`}
                key={item.title}
                className={classNames(cssClass)}
                onClick={
                  event => onItemSelected(event, index)
                }
              >
                {item.title}
              </a>
            );
          })
        }
      </div>
    </div>
  );
};
