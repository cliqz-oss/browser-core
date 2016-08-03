
////////////////////////////////////////////////////////////////////////////////
// Generic Rule class
export class Rule {
  constructor(clusterID = -1) {
    this.cid = clusterID;
  }

  //
  // @brief set the associated cluster
  //
  setClusterID(clusterID) {
    this.cid = clusterID;
  }

  //
  // @brief return the current associated cluster ID. We assume that we will
  //        have one (or multiple) rules per cluster.
  //
  clusterID() {
    return this.cid;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                        API TO IMPLEMENT
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this function should return a map with the following data:
  //  {
  //    id1: {name: 'fid_name', args: {arg_name1: arg_value1, ...}},
  //  }
  //
  // note that we could have repeated fid_names if and only if they differ
  // in the arg_values for the same arg_name. If not this will be less performant
  // (in the future we can automatically check this.)
  //
  fidsMappings() {
    throw new Error('The Rule::fidsMappings for ' + this.cid + ' should be implemented!');
  }

  //
  // @brief this method is the one that should contain the rule logic to be
  //        evaulated.
  // @param fidsValuesMapping is the argument containing the following data
  //        structure:
  //  {
  //    id1: value,
  //  }
  // where id1 is the same id provided in get fidsMappings() function and
  //       value is the resulting value from the evaluated fid with the given
  //             arguments.
  //
  // @return a value between [0,1] as intent value.
  //
  evaluate(fidsValuesMapping) {
    throw new Error('The Rule::evaluate for ' + this.cid + ' should be implemented!');
  }


}



