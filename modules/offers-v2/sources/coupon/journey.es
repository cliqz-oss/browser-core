function assert(condition) { if (!condition) { throw Error('Journey\'s Error'); } }
function first(v) { assert(v.length !== 0); return v[0]; }

export default class Journey {
  done = false;

  lastTs = Date.now();

  bestPath = [];

  paths = [];

  constructor(other = {}) { // default and copy constructors
    Object.keys(this).forEach((key) => {
      if (other[key] !== undefined) { this[key] = other[key]; }
    });
    if (other.bestPath !== undefined) { this.bestPath = [...other.bestPath]; }
    if (other.paths !== undefined) { // otherwise use default values
      this.paths = JSON.parse(JSON.stringify(other.paths)); // deep copy
    }
  }

  init(paths) { // Array<String>
    assert(paths && paths.length !== 0);
    paths.forEach(p => assert(p.length !== 0));
    this.paths = paths.map(p => p.split(' '));
  }

  /*
    journey is { paths: ['a b c', 'a d e', 'a b z'], bestPath: [] }
    journey.receive('a');
    now journey is { paths: ['b c', 'd e', 'b z'], bestPath: ['a'] }
    journey.receive('x');
    the same journey's state compare to previous step
    journey.receive('b');
    now journey is { paths: ['c', 'z'], bestPath: ['a b'] }
    for more information go to tests
  */
  receive(ev) {
    if (this.done) { return; }
    assert(this.paths.length !== 0);
    const results = this.paths.map((_, i) => this._try(i, ev));
    if (!results.some(Boolean)) { return; }
    this.bestPath.push(ev);
    this.lastTs = Date.now();
    this.paths = this.paths.filter((_, i) => results[i]);
  }

  getBestPath() { return this.bestPath.join(' '); }

  _try(pathIndex, ev) {
    if (first(this.paths[pathIndex]) !== ev) { return false; }
    this.paths[pathIndex].shift();
    if (this.paths[pathIndex].length === 0) { this.done = true; }
    return true;
  }
}
