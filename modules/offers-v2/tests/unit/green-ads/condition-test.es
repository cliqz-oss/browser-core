/* global chai */
/* global describeModule */

const moment = require('moment');

export default describeModule('offers-v2/green-ads/condition',
  () => ({
    'offers-v2/green-ads/logger': {
      default: {
        debug() {},
        log(...args) { console.log(...args); },
        error(...args) { console.log('ERROR', ...args); },
      },
    },
    'platform/lib/moment': {
      default: moment,
    },
  }),
  () => {
    describe('Condition evaluation', () => {
      let Condition;

      beforeEach(function () {
        Condition = this.module().default;
      });

      it('collects and parses all patterns', () => {
        const condition = new Condition({
          or: [
            { match: { url: '||foo' } },
            { match: { url: '||bar' } },
            { and: [
              { match: { url: '||baz' } },
              { none: [
                { match: { url: '||cliqz' } },
                { match: { query: 'foo' } },
              ] },
              { seq: [
                { match: { url: '||bar' } },
                { match: { query: 'bar' } },
              ] },
            ] }
          ]
        });
        chai.expect(condition.queryPatterns.map(p => p.toString())).to.be.eql([
          'foo',
          'bar',
        ]);
        chai.expect(condition.urlPatterns.map(p => p.toString())).to.be.eql([
          '||foo^',
          '||bar^',
          '||baz^',
          '||cliqz^',
          '||bar^',
        ]);
      });

      // TODO
      // it('evaluate with count constraints', () => {
      //   chai.expect(new Condition({
      //     { match: { url: '' } },
      //   })).to.be.eql(false);
      // });

      context('match (url)', () => {
        let condition;
        let patterns;

        beforeEach(() => {
          condition = new Condition({
            match: { url: '||foo' }
          });
          patterns = condition.urlPatterns;
        });

        it('has one url pattern', () => {
          chai.expect(patterns.length).to.equal(1);
        });

        it('does not match query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: patterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('matches with right url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });

      context('match with time constraint (url)', () => {
        let condition;
        let patterns;

        beforeEach(() => {
          condition = new Condition({
            match: { url: '||foo', seen_in_last_n_days: 2 }
          });
          patterns = condition.urlPatterns;
        });

        it('matches on same day', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: moment().valueOf() },
          ])).to.be.eql(true);
        });

        it('matches on previous day', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: moment().subtract(1, 'days').valueOf() },
          ])).to.be.eql(true);
        });

        it('matches 2 days before', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: moment().subtract(2, 'days').valueOf() },
          ])).to.be.eql(true);
        });

        it('does not match 3 days before', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: moment().subtract(3, 'days').valueOf() },
          ])).to.be.eql(false);
        });
      });

      context('match (query)', () => {
        let condition;
        let patterns;

        beforeEach(() => {
          condition = new Condition({
            match: { query: 'foo' }
          });
          patterns = condition.queryPatterns;
        });

        it('has one query pattern', () => {
          chai.expect(patterns.length).to.equal(1);
        });

        it('does not match with url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: patterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('matches with right query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: patterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('takes source into account (match)', () => {
          condition = new Condition({
            match: { query: 'foo', source: 'amazon' }
          });
          patterns = condition.queryPatterns;
          chai.expect(condition.match([
            { type: 'query', pattern: patterns[0], ts: Date.now(), target: { source: 'amazon' } },
          ])).to.be.eql(true);
        });

        it('takes source into account (no match)', () => {
          condition = new Condition({
            match: { query: 'foo', source: 'amazon' }
          });
          patterns = condition.queryPatterns;
          chai.expect(condition.match([
            { type: 'query', pattern: patterns[0], ts: Date.now(), target: { source: 'cliqz' } },
          ])).to.be.eql(false);
        });
      });

      context('evaluate or', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            or: [
              { match: { query: 'foo' } },
              { match: { url: '||foo' } },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('has one query pattern and one url pattern', () => {
          chai.expect(urlPatterns.length).to.equal(1);
          chai.expect(queryPatterns.length).to.equal(1);
        });

        it('does not match with no pattern matched', () => {
          chai.expect(condition.match([
          ])).to.be.eql(false);
        });

        it('matches with the right query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('matches with the right url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('matches with both url and query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });

      context('evaluate or (min_match)', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            min_match: 2,
            or: [
              { match: { query: 'foo' } },
              { match: { url: '||bar' } },
              { match: { query: 'baz' } },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('has two query pattern and one url pattern', () => {
          chai.expect(urlPatterns.length).to.equal(1);
          chai.expect(queryPatterns.length).to.equal(2);
        });

        it('does not match with no pattern matched', () => {
          chai.expect(condition.match([
          ])).to.be.eql(false);
        });

        it('does not match with only one query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('does not match with only one url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('matches with both url and query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('matches with both queries', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[1], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('matches with both queries and url', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[1], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });

      context('evaluate and', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            and: [
              { match: { query: 'foo' } },
              { match: { url: '||foo' } },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('has one query pattern and one url pattern', () => {
          chai.expect(urlPatterns.length).to.equal(1);
          chai.expect(queryPatterns.length).to.equal(1);
        });

        it('does not match with no pattern matched', () => {
          chai.expect(condition.match([
          ])).to.be.eql(false);
        });

        it('does not match with only query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('does not match with only url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('matches only with both query and url', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });

      context('evaluate none', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            none: [
              { match: { query: 'foo' } },
              { match: { url: '||foo' } },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('has one query pattern and one url pattern', () => {
          chai.expect(urlPatterns.length).to.equal(1);
          chai.expect(queryPatterns.length).to.equal(1);
        });

        it('matches with empty stream', () => {
          chai.expect(condition.match([])).to.be.eql(true);
        });

        it('matches with other match', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: { id: 'fake_id' }, ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('does not match with query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('does not match with url', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('does not match with url and query', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });
      });

      context('evaluate seq', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            seq: [
              { match: { query: 'foo' } },
              { match: { url: '||foo' } },
              { seq: [
                { match: { url: '||bar' } },
                { match: { url: '||baz' } },
              ] },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('has one query pattern and three url pattern', () => {
          chai.expect(urlPatterns.length).to.equal(3);
          chai.expect(queryPatterns.length).to.equal(1);
        });

        it('does not match with empty stream', () => {
          chai.expect(condition.match([])).to.be.eql(false);
        });

        it('does not match with wrong order', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[1], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[2], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('does not match with wrong order', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[2], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[1], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('matches with correct order', () => {
          chai.expect(condition.match([
            { type: 'query', pattern: queryPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[1], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[2], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });

      context('evaluate complex condition', () => {
        let condition;
        let queryPatterns;
        let urlPatterns;

        beforeEach(() => {
          condition = new Condition({
            and: [
              {
                or: [
                  { match: { url: '||deliveroo.de' } },
                  { match: { url: '||lieferando.de' } },
                  { match: { url: '||hanoideli.de' } },
                ]
              },
              {
                or: [
                  { match: { query: 'pizza cheese' } },
                  { match: { query: 'pizza ham' } },
                  { and: [
                    { match: { query: 'foodora' } },
                    { match: { query: 'pie' } },
                  ] }
                ]
              },
            ]
          });
          urlPatterns = condition.urlPatterns;
          queryPatterns = condition.queryPatterns;
        });

        it('should have 3 url patterns', () => {
          chai.expect(urlPatterns.length).to.equal(3);
        });

        it('should have 4 url queries', () => {
          chai.expect(queryPatterns.length).to.equal(4);
        });

        it('should not match with empty stream', () => {
          chai.expect(condition.match([])).to.be.eql(false);
        });

        it('should not match 1', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('should not match 2', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'url', pattern: urlPatterns[1], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('should not match 3', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[2], ts: Date.now() },
          ])).to.be.eql(false);
        });

        it('should match 1', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[1], ts: Date.now() },
          ])).to.be.eql(true);
        });

        it('should match 2', () => {
          chai.expect(condition.match([
            { type: 'url', pattern: urlPatterns[0], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[2], ts: Date.now() },
            { type: 'query', pattern: queryPatterns[3], ts: Date.now() },
          ])).to.be.eql(true);
        });
      });
    });
  }
);
