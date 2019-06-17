/* eslint-disable no-unused-expressions */
/* global chai */
/* global describeModule */

export default describeModule('anolysis/internals/preprocessor',
  () => ({
    'core/platform': {},
    'core/prefs': {
      default: {
        get(pref, def) {
          if (pref === 'developer') { return true; }
          return def;
        },
      },
    },
    'anolysis/internals/logger': {
      default: {
        debug() {},
        log() {},
        error() {},
      },
    },
  }),
  () => {
    let preprocessor;

    beforeEach(function () {
      const Preprocessor = this.module().default;
      preprocessor = new Preprocessor();
    });

    describe('#process', () => {
      it('transforms legacy signal', () =>
        preprocessor.process({
          type: 'foo',
          action: 'bar',
          baz: 42,
        }).then(processed => chai.expect(processed).to.be.eql({
          type: 'foo.bar',
          behavior: {
            type: 'foo',
            action: 'bar',
            baz: 42,
          },
        })));

      it('transforms legacy signal (with custom preprocessor)', () =>
        preprocessor.process({
          type: 'activity',
          action: 'result_click',
          current_position: 0,
          query_length: 42,
          reaction_time: 10,
          display_time: 10,
          urlbar_time: 10,
        }).then(processed => chai.expect(processed).to.be.eql({
          type: 'result_selection_click',
          behavior: {
            current_position: 0,
            query_length: 42,
            reaction_time: 10,
            display_time: 10,
            urlbar_time: 10,
          },
        })));
    });

    describe('#getId', () => {
      it('should return empty String for no components', () => {
        preprocessor.idComponents = [];
        const id = preprocessor.getId({ test: 'test.val' });
        chai.expect(id).to.be.empty;
      });
    });

    describe('#isObject', () => {
      it('should return true for empty object value', () => {
        chai.expect(preprocessor.isObject({})).to.be.true;
      });
      it('should return true for object value', () => {
        chai.expect(preprocessor.isObject({ foo: 'bar' })).to.be.true;
      });
      it('should return true for list value', () => {
        chai.expect(preprocessor.isObject([])).to.be.true;
      });
      it('should return false for integer value', () => {
        chai.expect(preprocessor.isObject(1)).to.be.false;
      });
      it('should return false for float value', () => {
        chai.expect(preprocessor.isObject(1.1)).to.be.false;
      });
      it('should return false for string value', () => {
        chai.expect(preprocessor.isObject('test')).to.be.false;
      });
      it('should return false for boolean value', () => {
        chai.expect(preprocessor.isObject(true)).to.be.false;
      });
      it('should return false for null value', () => {
        chai.expect(preprocessor.isObject(null)).to.be.false;
      });
    });

    describe('#isDemographics', () => {
      it('should false for empty signal', () => {
        chai.expect(preprocessor.isDemographics(Object.create(null))).to.be.false;
      });
      it('should false for signal without type', () => {
        chai.expect(preprocessor.isDemographics({ key: 1 })).to.be.false;
      });
      it('should false for signal of different type than "environment"', () => {
        chai.expect(preprocessor.isDemographics({ type: 'some_type' })).to.be.false;
      });
      it('should true for signal of type "environment"', () => {
        chai.expect(preprocessor.isDemographics({ type: 'environment' })).to.be.true;
      });
    });
  });
