
// Some analyses only consist in selecting fields from the
// aggregation. In which case the telemetry schema is used
// to create the analysis, using the SchemaAnalysis wrapper.
// import schemas from 'anolysis/telemetry-schemas';
// import ABTestsAnalysis from 'anolysis/analyses/abtests';


/*
 * Not used at the moment
class SchemaAnalysis {
  constructor(schema, name) {
    this.selectors = Object.keys(schema.schema);
    this.name = name;
  }

  generateSignals(aggregation) {
    const data = {};

    // TODO: What should happen if one or more types required
    // in `selectors` is not present in `aggregation`? Should
    // we send some special meta-message? Like IncompleteAnalysis.
    this.selectors.forEach((selector) => {
      data[selector] = aggregation[selector];
    });

    return [{ id: this.name, data }];
  }
}
*/

/** Defines a list of analyses. Each analysis will be fed with an
* aggregation of behavioral signals to general messages to send
* to the backend.
*/
const analyses = [
  // Schemas
  // TODO: ping should not be sent as part of aggregation analyses, otherwise it
  // will be sent retro-actively every day. Also, retention now gives us the
  // same information? So is it needed at all.
  // new SchemaAnalysis(schemas.ping, 'ping'),

  // TODO: This analysis is disabled for now as the aggregation mechanism needs
  // a bit of love. We probably will change this once we have a few real use
  // cases to work on.
  // new ABTestsAnalysis(),
];
export default analyses;
