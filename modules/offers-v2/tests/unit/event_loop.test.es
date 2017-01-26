const expect = require('chai').expect;

import TestEnvironment from './environments/test_environment'
import EventLoop from '../../sources/event_loop'

describe('EventLoop', () => {
  it('should start event loop', () => {

    expect(function() {
      var env = new TestEnvironment();
      var el = new EventLoop(env);
    }).to.not.throw(Error);
  });
});



describe('EventLoop', () => {
  it.skip('end-to-end', (done) => {
    // add test trigger t1 on the server
    // curl --user 3c94377b21b5548f72bf47c657dfd70b: -H "Content-Type: application/json" -X POST -d '[{"trigger_id":"t1","parent_trigger_ids":["root"],"validity":[0,9999999999],"paused":false,"ttl":3600}]' http://localhost:8080/api/v1/addtriggers

    // remove test trigger after testing
    // curl --user 3c94377b21b5548f72bf47c657dfd70b: -H "Content-Type: application/json" -X POST -d '["t1"]' http://localhost:8080/api/v1/removetriggers

    var env = new TestEnvironment();
    var el = new EventLoop(env);

    env.emitUrlChange("http://cliqz.com");

    setTimeout(() => {
      let trigger = el.triggerCache.triggerIndex['t1'];
      expect(!!trigger).to.be.true;
      done()
    }, 1500);
  });

});
