/**
 * The current pipeline of processing offers is always the same. Given a list
 * of offers -> do something -> return a list of offers.
 * This will be the interface to handle the offers
 */
export default class OfferJob {
  constructor(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  /**
   * given a list of offers perform some processing and return the list of it.
   * This returns a promise since the operations can be delayed
   *
   */
  process(/* offerList, context = { } */) {
    throw new Error('should be implemented by the inheritance class');
  }
}
