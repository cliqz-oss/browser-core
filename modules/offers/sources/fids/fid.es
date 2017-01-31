import { utils } from 'core/cliqz';


////////////////////////////////////////////////////////////////////////////////
// Generic FID class
export class FID {
  constructor(name) {
    this.name = name;
  }

 // The get syntax binds an object property to a
 // function that will be called when that property is looked up.
  get detectorName() {
    return this.name;
  }

  configureDataBases(dbsMap) {
    throw new Error('The FID::configureDataBases for ' + this.name + ' should be implemented!');
  }

  configureArgs(configArgs) {
      throw new Error('The FID::configureArgs for ' + this.name + ' should be implemented!');
  }

  evaluate(intentInput, extras) {
     throw new Error('The FID::evaluate for ' + this.name + ' should be implemented!');
  }
}



