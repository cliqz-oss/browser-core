/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

import Button from './button';
import Row from './row';

function RefreshState({
  refreshButtonValue,
  syncState
}) {
  return (
    <Row>
      <Button
        onClick={syncState}
        value={refreshButtonValue}
      />
    </Row>
  );
}

RefreshState.propTypes = {
  refreshButtonValue: PropTypes.string,
  syncState: PropTypes.func.isRequired,
};

RefreshState.defaultProps = {
  refreshButtonValue: 'REFRESH STATE',
};

export default RefreshState;
