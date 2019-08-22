/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const Funnel = require('broccoli-funnel');
const Source = require('broccoli-source');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');
const cliqzConfig = require('./config');
const util = require('./util');
const env = require('./cliqz-env');

const specific = cliqzConfig.specific || 'cliqz-tab';
let specificTree = new Source.WatchedDir(`specific/${specific}`);

const TESTING_ACCESSIBLE_RESOURCES = [
  'modules/core/EventUtils.js'
];
const TESTING_EXPERIMENTAL_APIS = {
  testHelpers: {
    schema: 'modules/integration-tests/experimental-apis/test-helpers/schema.json',
    parent: {
      scopes: ['addon_parent'],
      paths: [['testHelpers']],
      script: 'modules/integration-tests/experimental-apis/test-helpers/api.bundle.js'
    }
  }
};

if (env.INCLUDE_TESTS) {
  const manifest = JSON.parse(fs.readFileSync(`specific/${specific}/manifest.json`));

  // add testing web_accessible_resources
  const accessibleResources = TESTING_ACCESSIBLE_RESOURCES
    .reduce(
      (resources, resource) => resources.add(resource),
      new Set(manifest.web_accessible_resources)
    );
  manifest.web_accessible_resources = Array.from(accessibleResources);

  // add testing experimental APIs
  const apis = manifest.experiment_apis || {};
  Object.assign(apis, TESTING_EXPERIMENTAL_APIS);
  manifest.experiment_apis = apis;

  const manifestTree = writeFile('manifest.json', JSON.stringify(manifest, null, '  '));
  specificTree = new MergeTrees([
    specificTree,
    manifestTree
  ], { overwrite: true });
}

const config = writeFile('cliqz.json', JSON.stringify(cliqzConfig));
const configTree = util.injectConfig(specificTree, config, 'cliqz.json', [
  'manifest.json',
].concat(cliqzConfig.updateURL ? ['updates.json'] : []));

specificTree = new MergeTrees([
  specificTree,
  configTree,
], { overwrite: true });

module.exports = new Funnel(specificTree, {
  exclude: ['**/locale'],
});
