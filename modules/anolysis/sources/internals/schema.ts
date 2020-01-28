/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as jsonschema from 'jsonschema';

import { Records } from './records';
import { Behavior } from './signal';
import { Demographics, DemographicTrait } from './demographics';

export type JsonSchema = object;

/**
 * In cases where client-side aggregation is not feasible, an ephemeral ID
 * might be specified. An ephemeral ID is an identifier which is:
 *
 *  * Limited in time - it will be rotated up to every day/week/month.
 *  * Per-user - it is derived from `session` and salted further.
 *  * Per-signal - it is salted using the name of the analysis.
 *
 * The goal of an ephemerid is to allow some limited backend aggregation
 * while preventing record linkage. This is achieved by having the lifespan
 * of an ID being aggressively limited in time (see 'unit') and
 * scoped per signal (which prevents linking to other signals).
 */
export type EphemerId = {
  // 'absolute' ephemerids are aligned with the calendar, for example
  // they change every week (on Monday) or every first of the month
  kind: 'absolute';

  // Unit (or granularity) and n (or frequency) together define the time range
  // an ephmerid stays constant for. For example:
  // *  'day', 1: ephemerid changes daily
  // *  'day', 7: ephemerid changes every 7 days
  //    (note: for 'absolute', it changes every multiple of 7 days starting from Jan 1st)
  // *  'week', 1: ephemerid changes every Monday
  // *  'week', 2: ephemerid changes every 2nd Monday
  // *  'month', 1: ephemerid changes monthly
  // *  'month', 5: ephemerid changes in January, June, January, ...
  //    (note: intervals are of the same length)
  unit: 'day' | 'week' | 'month';

  n: number;
} | {
  // 'relative' ephemerids are aligned with the install date, for example
  // they change 40 days after installation; unit needs to be 'day'.
  kind: 'relative';
  unit: 'day';
  n: number;
}

/**
 * A schema describe a signal which is collected by `telemetry`. It can be of
 * two kinds: metrics or analyses. This is more of a conceptual difference
 * since the implementation is the same. An analysis is a signal which requires
 * some aggregation function to be emitted (i.e.: the `generate(...)`
 * attribute). A metric is any other signal (it is emitted directly by invoking
 * `telemetry.push(...)`).
 */
export interface Schema {
  // Name of the signal. We tend to follow the following guidelines for naming:
  //
  // 1. Metrics should have a name starting with 'metrics.'
  // 2. Analyses should have a name starting with 'analyses.'
  // 3. The name of the module should appear next: 'metrics.freshtab'
  //
  // This allows some basic name-spacing and gives structure to names.
  name: string;

  // Schemas *must* be annotated with a meaningful description. It should
  // answer the following questions and is intended both as a documentation for
  // developers and a transparency tool for users of the product:
  //
  // 1. What information is collected (give some example)
  // 2. Why do we need this information, how is it used?
  // 3. If the collection is temporary, indicate when the schema can be removed.
  description: string;

  // When a schema specifies a `generate(...)` function it is considered to be
  // an aggregation and will by default trigger for past days. To allow
  // customizing this behavior, an optional `offsets` attribute can be
  // specified to dictate when the `generate(...)` should be called. An offset
  // of `0` means that the aggregation can run for the current day. Offsets
  // higher than `0` correspond to past days: offset=1 means day before today,
  // offset=2 means two days ago, etc.
  offsets?: number[];

  // When a schema specifies a `generate(...)` function, it is given access to
  // an object of type `Records`, containing all metrics available for
  // aggregation. Optionally, the schema can specify a list of metrics which
  // this aggregation depends on.
  metrics?: string[];

  // When a schema specifies a `generate(...)` function, it will automatically
  // be triggered once per day (by default). It is possible to specify
  // different "rates" to call this function less often than once per day
  // (e.g.: once per week or once per month).
  rate?: 'day' | 'week' | 'month';

  // JSON Schema which instances of this schema need to comply with.
  schema: JsonSchema;

  // If specified, indicates that this particular signal should be collected.
  // The value of this key contains further information required for sending
  // (e.g.: demographics, ephemerid, version, etc.).
  sendToBackend: {
    // Schemas *must* be versioned. Version should start at `0` and be increased
    // everytime the schema or semantics changes. This allows users of the data
    // on the backend to handle updates.
    version: number;

    // Signals sent to the backend *might* optionally be accompanied by a set
    // of demographics corresponding to the user. Each signal needs to specify
    // which demographics are needed. If none is specified, then this field
    // will be omitted completely from the payload (the default).
    demographics?: Array<DemographicTrait>;

    // See documentation above.
    ephemerid?: EphemerId;
  };

  // Optional. A function which will automatically be called to generate
  // instances of this schema. This function is guaranteed to only be called
  // once per day and can be used to perform aggregations.
  generate?: (_: { date: string; records: Records }) => Promise<Behavior[]>;
}

/**
 * Validate a `schema` by making sure that mandatory fields are specified.
 */
export function assertIsValidSchema(schema: Schema): void {
  // Make sure 'name' is specified
  if (schema.name === undefined) {
    throw new Error(`schema ${schema.name} is missing a 'name' value`);
  }

  // Make sure 'description' is specified. NOTE: since signals don't specify
  // this value currently the check is disabled until we migrate schemas.
  // if (schema.description === undefined) {
  //   throw new Error(`schema ${schema.name} is missing a 'description' value`);
  // }

  // Make sure 'schema' is specified. NOTE: here we could enforce more granular
  // constraints on each schema, which could also help when creating a new one
  // (e.g.: invalid JSON schema, missing constraints, etc.).
  if (schema.schema === undefined) {
    throw new Error(`schema ${schema.name} is missing a 'schema' value`);
  }

  // Make sure that if a list of metrics is specified, it is an array of strings.
  if (schema.metrics !== undefined) {
    if (!Array.isArray(schema.metrics)) {
      throw new Error(`schema ${schema.name} specified 'metrics' which is not an array: ${typeof schema.metrics}`);
    }

    for (const metric of schema.metrics) {
      if (typeof metric !== 'string') {
        throw new Error(`schema ${schema.name} specified a metric which is not a string: ${metric}, ${typeof metric}`);
      }
    }
  }

  // Validate 'sendToBackend' attribute
  if (schema.sendToBackend) {
    if (typeof schema.sendToBackend !== 'object') {
      throw new Error(`schema ${
        schema.name
      } should have 'sendToBackend' property of type 'object', found: ${
        typeof schema.sendToBackend
      }`);
    }

    // Make sure 'version' is specified for sendToBackend schemas
    if (schema.sendToBackend.version === undefined) {
      throw new Error(`schema ${schema.name} is missing a 'sendToBackend.version' value`);
    }
  }
}

/**
 * Check that `signal` meets constraints expressed by JSON schema from `schema`.
 */
export function validate(
  schema: Schema,
  signal: object,
): { valid: boolean; errors: jsonschema.ValidationError[] } {
  return jsonschema.validate(signal, schema);
}

/**
 * See description above in `Schema` declaration.
 */
export function shouldGenerateForOffset(
  schema: Schema,
  offset: number,
): boolean {
  if (schema.generate === undefined) {
    return false;
  }

  if (schema.offsets === undefined) {
    return offset >= 1 && offset <= 30;
  }

  return schema.offsets.includes(offset);
}

export function isAnalysis(schema: Schema): boolean {
  return schema.generate !== undefined;
}

export function isMetric(schema: Schema): boolean {
  return isAnalysis(schema) === false;
}

export function isSendToBackend(schema: Schema): boolean {
  return schema.sendToBackend !== undefined;
}

export function getDemographics(
  schema: Schema,
  demographics: Partial<Demographics>,
): Partial<Demographics> {
  if (
    schema.sendToBackend === undefined ||
    schema.sendToBackend.demographics === undefined
  ) {
    return {};
  }

  const subset: Partial<Demographics> = {};
  for (const trait of schema.sendToBackend.demographics) {
    subset[trait] = demographics[trait];
  }
  return subset;
}
