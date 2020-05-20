/* global chai */
/* global describeModule */

export default describeModule('offers-templates/content/control-center/algorithms',
  () => ({ }),
  () => {
    describe('uniqueIndexes function', () => {
      let uniqueIndexes;

      describe('basic cases', () => {
        beforeEach(function () {
          uniqueIndexes = this.module().uniqueIndexes;
        });

        it('with empty array', () => {
          chai.expect(uniqueIndexes([])).to.be.eql([]);
        });
        it('with single elem', () => {
          chai.expect(uniqueIndexes([1])).to.be.eql([0]);
        });
        it('with two different elems', () => {
          chai.expect(uniqueIndexes([3, 4])).to.be.eql([0, 1]);
        });
        it('with same two elems', () => {
          chai.expect(uniqueIndexes([4, 4])).to.be.eql([0]);
        });
        it('with four elems', () => {
          chai.expect(uniqueIndexes(['a', 'b', 'c', 'd'])).to.be.eql([0, 1, 2, 3]);
        });
        it('with 8 elems', () => {
          chai.expect(uniqueIndexes([1, 2, 3, 1, 2, 3, 4, 2])).to.be.eql([0, 1, 2, 6]);
        });
      });

      describe('cases with lambda', () => {
        beforeEach(function () {
          uniqueIndexes = this.module().uniqueIndexes;
        });

        it('with same two elems', () => {
          const op = x => x.a;
          chai.expect(uniqueIndexes([{ a: 1 }, { a: 1 }], op)).to.be.eql([0]);
        });
        it('with two different elems', () => {
          const op = x => x.a;
          chai.expect(uniqueIndexes([{ a: 1 }, { a: 2 }], op)).to.be.eql([0, 1]);
        });
        it('with three different elems', () => {
          const op = x => x.a;
          chai.expect(uniqueIndexes([{ a: 1 }, { a: 2 }, { a: 3 }], op)).to.be.eql([0, 1, 2]);
        });
        it('with four elems', () => {
          const op = x => x.a;
          const array = [{ a: 1 }, { a: 1 }, { a: 3 }, { a: 3 }];
          chai.expect(uniqueIndexes(array, op)).to.be.eql([0, 2]);
        });
      });

      describe('exotic cases', () => {
        beforeEach(function () {
          uniqueIndexes = this.module().uniqueIndexes;
        });

        it('with default arguments', () => {
          chai.expect(uniqueIndexes()).to.be.eql([]);
        });
        it('with undefined', () => {
          chai.expect(uniqueIndexes(undefined)).to.be.eql([]);
        });
        it('with same elem many times', () => {
          const array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          chai.expect(uniqueIndexes(array)).to.be.eql([0]);
        });
        it('with lambda which returns undefined', () => {
          const op = () => undefined;
          chai.expect(uniqueIndexes([1, 2, 3], op)).to.be.eql([0]);
        });
      });
    });

    describe('groupBy function', () => {
      let groupBy;

      describe('basic cases', () => {
        beforeEach(function () {
          groupBy = this.module().groupBy;
        });

        it('with empty array', () => {
          chai.expect(groupBy([])).to.be.eql({});
        });
        it('with single elem', () => {
          chai.expect(groupBy([1])).to.be.eql({ 1: [1] });
        });
        it('with two different elems', () => {
          chai.expect(groupBy([3, 4])).to.be.eql({ 3: [3], 4: [4] });
        });
        it('with same two elems', () => {
          chai.expect(groupBy([4, 4])).to.be.eql({ 4: [4, 4] });
        });
        it('with four elems', () => {
          const result = { a: ['a'], b: ['b'], c: ['c'], d: ['d'] };
          chai.expect(groupBy(['a', 'b', 'c', 'd'])).to.be.eql(result);
        });
        it('with 8 elems', () => {
          const result = { 1: [1, 1], 2: [2, 2, 2], 3: [3, 3], 4: [4] };
          chai.expect(groupBy([1, 2, 3, 1, 2, 3, 4, 2])).to.be.eql(result);
        });
      });

      describe('cases with lambda', () => {
        beforeEach(function () {
          groupBy = this.module().groupBy;
        });

        it('with same two elems', () => {
          const op = x => x.a;
          chai.expect(groupBy([{ a: 1 }, { a: 1 }], op)).to.be.eql({ 1: [{ a: 1 }, { a: 1 }] });
        });
        it('with two different elems', () => {
          const op = x => x.a;
          const result = { 1: [{ a: 1 }], 2: [{ a: 2 }] };
          chai.expect(groupBy([{ a: 1 }, { a: 2 }], op)).to.be.eql(result);
        });
        it('with three different elems', () => {
          const op = x => x.a;
          const result = { 1: [{ a: 1 }], 2: [{ a: 2 }], 3: [{ a: 3 }] };
          chai.expect(groupBy([{ a: 1 }, { a: 2 }, { a: 3 }], op)).to.be.eql(result);
        });
        it('with four elems', () => {
          const op = x => x.a;
          const array = [{ a: 1 }, { a: 1 }, { a: 3 }, { a: 3 }];
          const result = { 1: [{ a: 1 }, { a: 1 }], 3: [{ a: 3 }, { a: 3 }] };
          chai.expect(groupBy(array, op)).to.be.eql(result);
        });
      });

      describe('exotic cases', () => {
        beforeEach(function () {
          groupBy = this.module().groupBy;
        });

        it('with default arguments', () => {
          chai.expect(groupBy()).to.be.eql({});
        });
        it('with undefined', () => {
          chai.expect(groupBy(undefined)).to.be.eql({});
        });
        it('with same elem many times', () => {
          const array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          chai.expect(groupBy(array)).to.be.eql({ 0: array });
        });
        it('with lambda which returns undefined', () => {
          const op = () => undefined;
          chai.expect(groupBy([1, 2, 3], op)).to.be.eql({ undefined: [1, 2, 3] });
        });
      });
    });

    describe('removeWord function', () => {
      let removeWord;

      describe('basic cases', () => {
        beforeEach(function () {
          removeWord = this.module().removeWord;
        });
        it('with default arguments', () => {
          chai.expect(removeWord()).to.be.eql([false, '']);
        });
        it('with empty text', () => {
          chai.expect(removeWord('')).to.be.eql([false, '']);
        });
        it('with empty word', () => {
          chai.expect(removeWord('hello', '')).to.be.eql([false, 'hello']);
        });
        it('with text equal word', () => {
          chai.expect(removeWord('hello', 'hello')).to.be.eql([true, '']);
        });
      });

      describe('position of the word', () => {
        beforeEach(function () {
          removeWord = this.module().removeWord;
        });
        it('starts with', () => {
          chai.expect(removeWord('hello world', 'hello')).to.be.eql([true, 'world']);
        });
        it('in the middle', () => {
          chai.expect(removeWord('hello w again', 'w')).to.be.eql([true, 'hello again']);
        });
        it('ends with', () => {
          chai.expect(removeWord('hello world', 'world')).to.be.eql([true, 'hello ']);
        });
      });

      describe('exotic cases', () => {
        beforeEach(function () {
          removeWord = this.module().removeWord;
        });
        it('text less then word', () => {
          chai.expect(removeWord('a', 'aa')).to.be.eql([false, 'a']);
        });
        it('match many times simple', () => {
          chai.expect(removeWord('a a a a a', 'a')).to.be.eql([true, '']);
        });
        it('match many times extended', () => {
          chai.expect(removeWord('ba a ad a ac', 'a')).to.be.eql([true, 'ba ad ac']);
        });
      });
    });
  });
