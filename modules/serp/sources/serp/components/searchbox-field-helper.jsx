/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import classNames from 'classnames';
import SearchboxField from './searchbox-field';

export default ({
  query,
  handleKeyDown,
  handleFocus,
  handleBlur,
  updateSearchboxValue,
  placeholder,
  view,
  shouldDisplayLookAndFeelV1,
  shouldDisplayLookAndFeelV3,
  shouldHaveFocus,
}) => {
  const cssClasses = classNames({
    'searchbox-v1-field': shouldDisplayLookAndFeelV1,
    'searchbox-v1-field-main': shouldDisplayLookAndFeelV1 && view === 'main',
    'searchbox-v1-field-results': shouldDisplayLookAndFeelV1 && view === 'results',
    'searchbox-v3-field': shouldDisplayLookAndFeelV3,
    'searchbox-v3-field-main': shouldDisplayLookAndFeelV3 && view === 'main',
  });

  return (
    <SearchboxField
      cssClasses={cssClasses}
      placeholder={placeholder}
      handleKeyDown={handleKeyDown}
      handleFocus={handleFocus}
      handleBlur={handleBlur}
      updateSearchboxValue={updateSearchboxValue}
      value={query}
      shouldHaveFocus={shouldHaveFocus}
    />
  );
};
