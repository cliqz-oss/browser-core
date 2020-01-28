/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function mkFreshtabSchemaName(signal) {
  let schema = 'freshtab';

  if (signal.type !== undefined) {
    schema += `.${signal.type}`;
  }

  if (signal.action !== undefined) {
    schema += `.${signal.action}`;
  }

  if (signal.view !== undefined) {
    schema += `.${signal.view}`;
  }

  if (signal.target !== undefined) {
    schema += `.${signal.target}`;
  }

  return schema;
}

export function mkFreshtabSchema(signal) {
  const properties = {};
  for (const [key, value] of Object.entries(signal)) {
    switch (typeof value) {
      case 'string':
        properties[key] = {
          type: 'string',
          enum: [value],
        };
        break;
      case 'number':
        properties[key] = {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        };
        break;
      default:
        properties[key] = value;
    }
  }

  return {
    name: mkFreshtabSchemaName(signal),
    schema: {
      // NOTE: this is a bit too strict for now but as long as these schemas are
      // not sendToBackend it's safe to allow extra properties. We should still
      // be strict for results of aggregations though.
      // additionalProperties: false,
      required: Object.keys(properties),
      properties,
    },
  };
}
