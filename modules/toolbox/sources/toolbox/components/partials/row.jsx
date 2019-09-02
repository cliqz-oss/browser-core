/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import PropTypes from 'prop-types';

function Row({ children, idxOfChildToSpan }) {
  return (
    <tr>
      {React.Children.map(children, (child, idx) =>
        (
          ((typeof idxOfChildToSpan === 'number') && (idx === idxOfChildToSpan))
            ? <td colSpan="2">{child}</td>
            : <td>{child}</td>
        ))}
    </tr>
  );
}

Row.propTypes = {
  idxOfChildToSpan: PropTypes.number,
};

export default Row;
