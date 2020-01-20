/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import prefs from '../prefs';
import console from '../console';
import config from '../config';

const MIGRATION_VERSION_PREF = 'migrationVersion';
/**
 * IMPORTANT: always add migrations at the end of MIGRATIONS array
 */
const MIGRATIONS = [
  () => prefs.clear('historyLookupEnabled'),
  () => prefs.clear('modules.dropdown.enabled'),
  // remove prefs default values from storage - default value should be
  // fetched from config on every call to prefs.get
  () => Object.keys(config.default_prefs || {}).forEach((key) => {
    const value = prefs.get(key);
    if (value === config.default_prefs[key]) {
      prefs.clear(key);
    }
  }),
  // Import `extensions.cliqz.full_distribution` pref from Firefox prefs (see: EX-9174)
  async (app) => {
    // Host Setting have to be ready in order to migrate some prefs
    await app.prepareServices(['host-settings']);
    const distribution = await app.services['host-settings'].api.get('extensions.cliqz.full_distribution', null);
    if (distribution !== null) {
      prefs.set('full_distribution', distribution);
    }
  }
];

/**
 * Migrations will be executed one by one starting from the
 * begining of MIGRATIONS array.
 * If any migration fail, no future migrations will be run,
 * but App will continue to run.
 * Index of last run migration is saved so on next startup we
 * wont rerun migrations.
 */
export default async function migrate(app) {
  let version = Number(prefs.get(MIGRATION_VERSION_PREF, 0));
  console.log('App', `Migration started with version ${version}`);
  try {
    while (version < MIGRATIONS.length) {
      const migration = MIGRATIONS[version];
      // eslint-disable-next-line no-await-in-loop
      await migration(app);
      version += 1;
    }
  } catch (e) {
    console.error('App', `Migration #${version + 1} failed`, e);
  } finally {
    console.log('App', `Migration finished with version ${version}`);
    prefs.set(MIGRATION_VERSION_PREF, version);
  }
}
