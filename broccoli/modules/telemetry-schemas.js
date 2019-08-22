/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const Ajv = require('ajv');

const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');

const config = require('../config');

const ajv = new Ajv();

/**
 * Collect telemetry schemas from `telemetry` module (in their JSON format) and
 * compile them to JavaScript functions which can be used for validation at
 * runtime. This allows to not have any dependency since the validation code is
 * shipped in the bundle.
 */
module.exports = (() => {
  const schemas = [];
  const modules = config.modules || [];
  if (modules.includes('telemetry')) {
    for (const module of modules) {
      const schemasFile = `./modules/telemetry/sources/schemas/${module}.json`;
      if (fs.existsSync(schemasFile)) {
        console.log('Compiling telemetry schemas:', module);
        const rawSchemas = JSON.parse(fs.readFileSync(schemasFile, { encoding: 'utf-8' }));
        for (const { name, description, schema } of rawSchemas) {
          const validator = ajv.compile(schema);
          schemas.push(`{
  name: '${name.trim()}',
  description: '${(description || '').trim()}',
  schema: ${JSON.stringify(schema)},
  validate: ${validator.toString()},
}`);
        }
      }
    }
  }

  if (schemas.length === 0) {
    return new MergeTrees([]);
  }

  const schemasSourceCode = `
export default [${schemas.join(',\n')}];
`;

  return new Funnel(writeFile('schemas.es', schemasSourceCode), { destDir: 'telemetry' });
})();
