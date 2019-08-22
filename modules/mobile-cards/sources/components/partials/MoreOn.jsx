/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { elementSideMargins } from '../../styles/CardStyle';
import Link from '../Link';
import { getMessage } from '../../../core/i18n';
import themeDetails from '../../themes';

const styles = theme => StyleSheet.create({
  text: {
    color: themeDetails[theme].subHeader,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 11,
    ...elementSideMargins,
  }
});

export default function (props) {
  const theme = props.theme;
  return (
    <Link label="generic-more-on" url={props.url}>
      <Text style={styles(theme).text}>
        {`${getMessage('more_on')} ${props.provider}`}
      </Text>
    </Link>
  );
}
