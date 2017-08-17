const expect = require('chai').expect;

import TestEnvironment from './environments/test_environment'
import EventLoop from '../../sources/event_loop'
import OperationExecutor from '../../sources/operation_executor'

describe('TriggerMachine', () => {
  it('should run basic trigger', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    var conditionResult = false;
    el.operationExecutor.operations['$test_op'] = function(args) {
      return new Promise((resolve, reject) => {
        conditionResult = true;
        resolve();
      });
    };

    var context = {
      '#url': 'http://example.com'
    };

    var trigger = {
      version: '1',
      parent_trigger_ids: [],
      trigger_id: 't1',
      ttl: 3600,
      condition:
        ['$and', [
          ['$match', ['example', '#url']],
          ['$gt', [['$week_day'], 0]]
        ]],
      actions: [
        ['$send_signal', ['some-signal']],
        ['$test_op']
      ]
    };

    return el.triggerMachine.run(trigger, context).then(() => {
      expect(conditionResult).to.be.true;
    });
  });


  it('should run subtriggers trigger', () => {
    var env = new TestEnvironment();
    var el = new EventLoop(env);

    el.environment.testResponse = [
      {
        version: '1',
        parent_trigger_ids: ['t1'],
        trigger_id: 't2',
        ttl: 3600,
        condition: null,
        actions: [
          ['$test_op']
        ]
      }
    ];

    var conditionResult = false;
    el.operationExecutor.operations['$test_op'] = function(args) {
      return new Promise((resolve, reject) => {
        conditionResult = true;
        resolve();
      });
    };

    var context = {
      '#url': 'http://example.com'
    };

    var trigger = {
      version: '1',
      parent_trigger_ids: [],
      trigger_id: 't1',
      ttl: 3600,
      condition: null,
      actions: [
        ['$activate_subtriggers', ['t1']]
      ]
    };

    el.triggerCache.addTrigger(trigger);

    return el.triggerMachine.run(trigger, context).then(() => {
      expect(conditionResult).to.be.true;
    });
  });


});
