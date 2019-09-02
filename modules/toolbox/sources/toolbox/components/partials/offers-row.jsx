/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';

function OffersRow({ title, values }) {
  const formatOutput = (obj) => {
    let parsed = obj;

    if (typeof parsed === 'boolean') {
      return JSON.stringify(parsed);
    }

    if (parsed instanceof Map) {
      parsed = [...obj.keys()];
    }
    if (Object.keys(parsed).length === 0) {
      return <p>- - -</p>;
    }
    return parsed.map(z => <p key={z}>{z}</p>);
  };

  return (
    <tr>
      <td>{title}</td>
      <td>
        <div style={{ height: '100px', overflowY: 'auto', overflowX: 'auto' }}>
          {formatOutput(values)}
        </div>
      </td>
    </tr>
  );
}

export default OffersRow;
