# Anolysis

Welcome to Anolysis, a privacy preserving framework for data collection,
allowing client-side aggregation of metrics of interest. Contrary to
most telemetry frameworks, Anolysis does not rely on the concept of
a user, but instead operates at the level of groups of users sharing
similar demographics (e.g.: installation date, operating system, etc.).

This README is meant to guide you through the process of using Anolysis.
During this process you will need to understand some new concepts, and
accept some of the constraints which come with privacy-preserving data
collection (which do not exist when you have the ability to assign
unique identifiers to each of your users). At any point in time, feel
free to approach @remusao and @ecnmst for further information.

# Terminology

Anolysis is still evolving, but some concepts are here to stay, so
before you read further, make sure you are familiar with the following
definitions:

* **Metric**: is a signal used to measure types of behavior inside the browser
  (e.g.: when users interact with some components, click on buttons,
  change settings, select results in the dropdown, etc.). They need to
  be explicitly collected by calling the `utils.telemetry` function.
  Metrics are generally not meant to be sent to the backend, but will
  instead be stored by Anolysis and made available for analyses to
  create aggregations.
* **Aggregation**: process of creating a summary (counting, averaging,
  grouping, etc.) from a list of granular *metrics* (collected over a
  period of time in the browser) into a single message that will be sent
  to the backend.
* **Analysis**: is the way we define client side aggregation "tasks"
  or functions. Each analysis exists to learn something or verify an
  hypothesis. Concretely, an analysis is a function having access to
  metrics collected in the browser during a specified period of time,
  and creates an aggregation or summary which will be sent to the
  backend. Each analysis will be triggered automatically by Anolysis
  once a day, using the metrics collected from the previous day.
* **Demographics**: are factors or traits that can be used to
  characterize or describe a user (e.g.: date of installation of the
  browser, operating system, where did the user download the browser from,
  etc.). Put together, they could easily form an *implicit* identifier
  for some users, which is why we need to reduce their granularity until
  k-anonymity is reached.
* **Group ID**: is a set of demographics shared by several users. Implicitly,
  when we talk about group IDs (or GIDs) in the context of Anolysis, we consider
  that they are safe in the sense of k-anonymity (i.e.: users' demographics have
  gone through a process of aggregation, which ensures that each user group size
  is large enough to prevent tracking).
* **Signal Definition**: is a set of metadata used to define a *metric* or *analysis*
  (e.g.: name, JSON schema, etc.). It is used both to specify and
  document the shape and content of signals, and to automatically test
  analyses by generating random instances of these signals. Moreover,
  we are also considering automatic analysis of the schemas to detect
  privacy breaches.
* **JSON Schema**: is a standard to specify schemas for JSON values or
  JavaScript Objects. We use it to define the shape and content of telemetry
  signals. (more information: http://json-schema.org/)

# What does Anolysis Provide

Anolysis as a framework aims at being minimal and robust to data-loss.
Ideally, once you push a signal (either a *metric* with `sendToBackend`
or the result of an aggregation from an *analysis*) using Anolysis you
can be sure that it will not be lost! This means that Anolysis will do
its best to make your signal reach the backend (retrying sending if
necessary, and persisting all state on disk to be resilient to browser
restarts). As an aggregation framework, it also provides a small set of
features, but tries to stay out of the way as much as possible. Most
of the internals do not need to be understood by users of the system;
things like persistence, group IDs negotiation, sending requests to the
backends, etc. will happen behind the scene.

# Architecture Overview

The source code can be found in `modules/anolysis/sources`. This folder contains
several sub-folders:

* `metrics/`, contains schemas (definitions) for `metrics`. In other word,
  every time you want to send a signal using `utils.telemetry()`, you need to
  make sure that it is defined in `metrics/` beforehand.
* `analyses/`, contains definitions for analyses (both JSON schemas and
  functions to perform aggregations).
* `internals/`, contains the core of Anolysis, and you should probably not need
  to look at it to use this module. Instead, focus on the two other folders!

And files:

* `telemetry-schemas.es`, is where we list all signals (metrics and analyses)
  currently available in Anolysis. If you create a new one, you should make sure
  it's registered there.
* `analyses-utils.es`, is where re-usable building blocks for aggregation should
  be shared.

Moreover, unit tests can be defined in `modules/anolysis/tests/unit`. Most
likely, you will only need to look at `telemetry-schemas-tests.es` to add unit
tests for your new analyses!

# Dataflow

How does the life of a telemetry signal look like?

To start with, we need to make the distinction between the two fundamentally
different kinds of signals we use: metrics and analyses.

*Metrics* are signals (or objects) that are emitted using `utils.telemetry()`
and are most of the time meant to be aggregated by one or more analyses. Each
metric has a name (e.g.: `freshtab.home.click.topnews`), as well as a JSON
schema which specifies the content of the signal.

*Analyses*, on the other hand, are never sent directly using
`utils.telemetry()`. Instead, they are generated from existing `metrics`.
To define how your aggregation should be performed, you need to provide
a `generate` function (in the definition), which will receive all
collected `metrics` (during the previous day), and output one or more
aggregated signals to be sent to the backend.

It is also possible to send a signal directly to the backend while
calling `utils.telemetry()`. This can be achieved if the definition of
the metric specifies `sendToBackend`.

In summary:

1. `utils.telemetry()` is called to emit a signal: (e.g.: `utils.telemetry({
foo: 42}, false, 'signal_name')`, where `signal_name` needs to refer to an existing
definition in the `metrics/` folder of Anolysis).
  * If `signal_name`'s definition has `sendToBackend` to `true`, then
    this signal will be sent to the backend straight away.
  * Otherwise (the default), it is collected by Anolysis and persisted in a
    database.
2. Every day, when the browser is started for the first time, Anolysis will
   trigger each analysis, calling their `generate` functions with all the
   `metrics` from the previous day as argument. Each analysis will return an
   array of new signals which will be sent to the backend.

# How to Create New Signals?

Here is the typical workflow to add new signals, depending on your use-case:

* You need to *aggregate several metrics* before sending your signal (currently
  aggregation uses metrics collected during a day):
  1. [Optional] create new metrics if needed,
  2. Create a new analysis in the `analyses/` folder,
  3. Register your analysis in `telemetry-schemas.es`,
  4. Add a test in `modules/anolysis/tests/unit/telemetry-schemas-test.es`.
* You want to *send signals directly to the backend*, without performing any
  aggregation (akin to current telemetry system):
  1. Make sure your signal has a definition in the `metrics/` folder,
  2. The definition should have a property `sendToBackend` with value `true`,
  3. The definition should have a property `version` with value being an integer,
  4. Register your new definition in `telemetry-schemas.es`,
  5. Use `utils.telemetry({ ... }, false, 'schema_name')` to send signals.

The following sections explain in more detail how to define new metrics or
analyses.

## Defining Metrics

To create a metric, follow the next two steps:
1. Add a new definition in the `metrics/` folder. We try to group metrics by
   feature or module (e.g.: `freshtab`, `dropdown`, etc.).
2. Register your new definition in `telemetry-schemas.es` (only if you created a
   new file for a new module).

A definition is a JavaScript object having some required properties:

* `name` (mandatory), you will notice that names usually contain some
  information about what the signal is, and what it measures (e.g.:
  `adblocker.engine.loading_time`), this allow for the actual payload
  to be kept small (ideally, one value: string or integer). Currently,
  any signal needs to be an object, but it's alright to have only one
  property.
* `schema` (mandatory), a valid JSON schema describing the structure of your signal.
* `sendToBackend` (default to `false`), indicates that this kind of signals should
  be sent straight away to the backend, and not aggregated.
* `needsGid` (only if `sendToBackend` is `true`), specifies if the group id should
  be sent as part of the signal. This default to `false`.

For example:

```javascript
{
  name: 'adblocker.engine.loading_time',
  schema: {
    properties: {
      ms: { type: 'integer', minimum: 0 },
    },
  },
}
```

## Defining an Analysis

Analyses are defined in the `analyses/` folder. The definition is very similar
to the one for a metric (meaning, the same attributes need to be used), but you
will have to specify one extra property: `generate`. Its value should be a
function which will be used to perform the aggregation, generating new signals
to send to our backend.

Example (this would be in the file: `analyses/adblocker-loading-time.es`):
```javascript
import { mean } from '../analyses-utils';

export default {
  name: 'adblocker-loading-time',
  version: 1,
  generate: ({ records }) => {
    // `records` is a DefaultMap with keys being names of metrics. Each metric
    // associated with an array of collected metrics of this type, during the
    // previous day. Calling `records.get('metric_name')` will return an array
    // of all instances of `metric_name` collected the previous day.
    const loading_times = records.get('adblocker.engine.loading_time');
    if (loading_times.length === 0) {
      return [];
    }

    return [{
      loading_time: mean(loading_times.map(({ ms }) => ms)),
    }];
  },
  schema: {
    properties: {
      loading_time: { type: 'integer', minimum: 0 },
    },
  },
};
```

A note about arguments given to the `generate` function. There are multiple
information you get out of the box:

1. `records`: This is a `DefaultMap` (see: `core/helpers/default-map`) where
   keys are names of metrics and values are arrays of all signals received for
   one day. This is the standard way of getting metrics for a day to aggregate
   them.
2. `date`: This is the day we are currently aggregating. For example, if today
   is `2018-01-02` and Anolysis triggers the aggregation of signals for the
   previous day (`2018-01-01`), then date will have value: `2018-01-01`.
3. `dateMoment`: This is the same as `date` but as a `moment` object, for easier
   manipulation of date.

## Testing a New Analysis

All tests related to analyses should be defined in `anolysis/tests/unit/analyses`.
Each Analysis will be tested in its own file. For example, analysis `my-analysis`
should be tested in the file: `anolysis/tests/unit/analyses/my-analysis-test.es`.

There are two kinds of tests which can be defined:

1. Automatic (*mandatory*), where random instances of metrics are generated from
   JSON schemas and we simply test that analyses do not raise exceptions,
   generate at least one signal, and generated signals are conform to JSON
   schemas.
2. Specific tests can also be defined for your analysis, where you can provide
   a list of metrics, and expect some signals to be generated. This is
   recommended, but not mandatory.

Here is how a simple test would look like (file:
`anolysis/tests/unit/analyses/my-analysis-test.es`):

```js
require('../telemetry-schemas-test-helpers')({
  name: 'my-analysis',
  metrics: ['metric1', 'metric2'],
  tests: (generateAnalysisResults) => {
    it('generates one signal', async function () {
      chai.expect(await generateAnalysisResults({
        metric1: [{}, {}],
        metric2: [{}],
      })).to.have.length(1);
    });
  },
});
```

Here is a quick glimpse of what happens in the `generateAnalysisResults`. This
function allows you to simulate real conditions of metrics aggregations:

* Register metrics in Anolysis.
* Trigger aggregation with your analysis.
* Intercept all signals which would be sent to backend.

So these tests can be seen as integration tests.


# Frequently Asked Questions

### Why do we need to define schemas for all signals?

Having the schemas centralized allows for a few things:
- It is easier to know, at any point of time, what data is sent from Cliqz.
- Each schema *must* be decorated with documentation to explain the intent.
- Schemas allow to automatically check that sent signals are valid.
- Schemas allow to automatically test your analyses by generating random
  instances of the metrics.
