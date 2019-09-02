/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import History from '../platform/history/history';
import prefs from '../core/prefs';
import pacemaker from '../core/services/pacemaker';

const MIGRATION_PREF = 'modules.history.migrationVersion';

export default function () {
  const migrationVersion = prefs.get(MIGRATION_PREF, 0);
  const migrationTimeout = pacemaker.setTimeout(() => {
    History.migrate(migrationVersion).then(
      () => prefs.set(MIGRATION_PREF, migrationVersion + 1)
    );
  }, 10 * 1000);

  return {
    dispose() {
      pacemaker.clearTimeout(migrationTimeout);
    },
  };
}
