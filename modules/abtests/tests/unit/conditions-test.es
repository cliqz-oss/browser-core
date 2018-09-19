/* global describeModule, chai */

let prefMock;

function resetMockPref() {
  prefMock = (p, def) => def;
}

function mockPrefs(prefs) {
  prefMock = (name, def) => {
    if (prefs[name] !== undefined) {
      return prefs[name];
    }
    return def;
  };
}

export default describeModule('abtests/conditions',
  () => ({
    'core/prefs': {
      default: {
        get: (...args) => prefMock(...args),
      },
    },
    'abtests/logger': {
      default: {
        error() {},
      }
    },
  }),
  () => {
    describe('#evalCondition', () => {
      let evalCondition;

      beforeEach(function () {
        evalCondition = this.module().default;
        resetMockPref();
      });

      context('simple conditions', () => {
        it('when pref exists', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            pref: { name: 'foo', hasValue: 'bar' },
          })).to.be.true;
        });

        it('when pref does not exist', () => {
          chai.expect(evalCondition({
            pref: { name: 'foo', hasValue: 'bar' },
          })).to.be.false;
        });

        it('when pref has different value', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            pref: { name: 'foo', hasValue: 'baz' },
          })).to.be.false;
        });

        it('when pref has missing "name" attribute', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            pref: { hasValue: 'bar' },
          })).to.be.false;
        });

        it('when pref has missing "hasValue" attribute', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            pref: { name: 'foo' },
          })).to.be.false;
        });
      });

      context('with and', () => {
        it('with no operand', () => {
          chai.expect(evalCondition({
            and: []
          })).to.be.true;
        });

        it('with one truthy operand', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            and: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.true;
        });

        it('with one falsy operand', () => {
          chai.expect(evalCondition({
            and: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });

        it('with multiple thruthy operands', () => {
          mockPrefs({
            foo: 'bar',
            alice: 'bob',
          });
          chai.expect(evalCondition({
            and: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
            ]
          })).to.be.true;
        });

        it('with multiple operands with one falsy', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            and: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });

        it('with all falsy operands', () => {
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });
      });

      context('with or', () => {
        it('with no operand', () => {
          chai.expect(evalCondition({
            or: []
          })).to.be.false;
        });

        it('with one truthy operand', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.true;
        });

        it('with one falsy operand', () => {
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });

        it('with multiple thruthy operands', () => {
          mockPrefs({
            foo: 'bar',
            alice: 'bob',
          });
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
            ]
          })).to.be.true;
        });

        it('with multiple operands with one falsy', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.true;
        });

        it('with all falsy operands', () => {
          chai.expect(evalCondition({
            or: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });
      });

      context('with noneOf', () => {
        it('with no operand', () => {
          chai.expect(evalCondition({
            noneOf: []
          })).to.be.true;
        });

        it('with one truthy operand', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            noneOf: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });

        it('with one falsy operand', () => {
          chai.expect(evalCondition({
            noneOf: [
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.true;
        });

        it('with multiple thruthy operands', () => {
          mockPrefs({
            foo: 'bar',
            alice: 'bob',
          });
          chai.expect(evalCondition({
            noneOf: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
            ]
          })).to.be.false;
        });

        it('with multiple operands with one falsy', () => {
          mockPrefs({ foo: 'bar' });
          chai.expect(evalCondition({
            noneOf: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.false;
        });

        it('with all falsy operands', () => {
          chai.expect(evalCondition({
            noneOf: [
              { pref: { name: 'foo', hasValue: 'bar' } },
              { pref: { name: 'alice', hasValue: 'bob' } },
              { pref: { name: 'foo', hasValue: 'bar' } },
            ]
          })).to.be.true;
        });
      });

      it('with unknown operator', () => {
        chai.expect(evalCondition({
          fakeOperator: [
            { pref: { name: 'foo', hasValue: 'bar' } },
          ]
        })).to.be.false;
      });

      context('with complex condition', () => {
        it('evaluates to true', () => {
          mockPrefs({
            foo: 'bar',
            alice: 'bob',
          });

          chai.expect(evalCondition({
            and: [
              { or: [
                { pref: { name: 'foo', hasValue: 'bar' } },
                { pref: { name: 'foo', hasValue: 'baz' } },
                { pref: { name: 'bar', hasValue: 'baz' } },
              ] },
              { and: [
                { pref: { name: 'foo', hasValue: 'bar' } },
              ] },
              { noneOf: [
                { pref: { name: 'foo', hasValue: 'baz' } },
                { pref: { name: 'bar', hasValue: 'baz' } },
              ] },
            ]
          })).to.be.true;
        });

        it('evaluates to false', () => {
          mockPrefs({
            foo: 'bar',
            alice: 'bob',
          });

          chai.expect(evalCondition({
            and: [
              { or: [
                { pref: { name: 'foo', hasValue: 'bar' } },
                { pref: { name: 'foo', hasValue: 'baz' } },
                { pref: { name: 'bar', hasValue: 'baz' } },
              ] },
              { and: [
                { pref: { name: 'foo', hasValue: 'bar' } },
              ] },
              { noneOf: [
                { pref: { name: 'foo', hasValue: 'baz' } },
                { pref: { name: 'bar', hasValue: 'baz' } },
                { pref: { name: 'foo', hasValue: 'bar' } },
              ] },
            ]
          })).to.be.false;
        });
      });
    });
  },
);
