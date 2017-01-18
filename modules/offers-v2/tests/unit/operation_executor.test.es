const expect = require('chai').expect;

import TestEnvironment from './environments/test_environment'
import EventLoop from '../../sources/event_loop'
import OperationExecutor from '../../sources/operation_executor'

describe('OperationExecutor', () => {
  it('should execute simple operation', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var operation = ['$match', ['bc', 'bc']];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
      expect(result).to.be.true;
    });
  });


  it('should execute session_count operation', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var ts = el.operationExecutor.timestamp();
    el.environment.testHistory = [
      {url: 'a2', timestamp: ts - 25*24*3600},
      {url: 'a3', timestamp: ts - 25*24*3600 + 600},
      {url: 'a4', timestamp: ts - 20*24*3600},
      {url: 'c5', timestamp: ts - 15*24*3600},
    ]

    var operation = ['$count_sessions', [30*24*3600, 7*24*3600, 30*60, ['a', 'b', 'c']]];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
      expect(result).to.eq(3);
    });
  });


  it('should execute active_since operation', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var ts = el.operationExecutor.timestamp();
    el.environment.testHistory = [
      {url: 'a1', timestamp: ts - 20*24*3600},
      {url: 'c2', timestamp: ts - 15*24*3600},
    ]

    var operation = ['$active_since', [10*24*3600, 0]];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
      expect(result).to.be.true;
    });
  });


  it('should execute nested operations', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var operation =
      ['$and', [
        ['$gt', [['$week_day'], 0]],
        ['$not', [
          ['$lt', [['$month_day'], 1]]
        ]]
      ]];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
      expect(result).to.be.true;
    });
  });


  it('should catch exception', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var operation = ['$and'];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
    }).catch(err => {
      expect(err).to.be.an('error')
    });
  });


  it('should cache operation result', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var operation = ['$timestamp', [], 60];
    var context = {eventLoop: el};

    return el.operationExecutor.execute(operation, context).then(result => {
      var result1 = result;

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(el.operationExecutor.execute(operation, context).then(result => {
            expect(result).to.be.equal(result1);
          }));
        }, 100);
      });
    });
  });

});
