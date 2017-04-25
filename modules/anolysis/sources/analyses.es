
import ABTestsAnalysis from 'anolysis/analyses/abtests';
import EmptySchema from 'anolysis/analyses/empty';
import EverythingAnalysis from 'anolysis/analyses/everything';
import RetentionAnalysis from 'anolysis/analyses/retention';


class SchemaAnalysis {
  constructor(schema) {
    this.schema = schema;
    this.name = schema.name;
    this.needs_gid = schema.needs_gid;
  }

  generateSignals(aggregation) {
    const data = {};
    // TODO: What should happen if one or more types required
    // in `selectors` is not present in `aggregation`? Should
    // we send some special meta-message? Like IncompleteAnalysis.
    this.schema.selectors.forEach((selector) => {
      data[selector] = aggregation[selector];
    });

    return [{ id: this.name, data }];
  }
}


/** Defines a list of analyses. Each analysis will be fed with an
* aggregation of behavioral signals to general messages to send
* to the backend.
*/
const analyses = [
  new SchemaAnalysis(EmptySchema),
  new EverythingAnalysis(),
  new RetentionAnalysis(), // Generates retention signals
  new ABTestsAnalysis(),
];
export default analyses;
