export default describeModule('telemetry/tree',
  function () {
    return {
      "core/fs": {
        readFile: '[dynamic]',
        writeFile: '[dynamic]',
        encodeText: '[dynamic]',
        decodeText: '[dynamic]',
      },
    }
  },
  function () {
    var tree;
    beforeEach(function() {
      const Tree = this.module().default;
      tree = new Tree();
    });
    describe('#load', function () {
      it('should call readFile with filename and isText set to true', function () {
        let filename;
        let isText;
        this.deps("core/fs").readFile = (_filename, _options) => {
          filename = _filename;
          isText = _options.isText;
          return Promise.resolve();
        }
        tree.load('a filename', { isText: true });
        chai.expect(filename).to.be.equal('a filename');
        chai.expect(isText).to.be.true;
      });
      it('should reject on empty file', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('');
        return chai.expect(tree.load('_')).to.eventually.be.rejected;
      });
      it('should reject on non-JSON input', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('no JSON');
        return chai.expect(tree.load('_')).to.eventually.be.rejected;
      });
      it('should reject on empty object', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('{}');
        return chai.expect(tree.load('_')).to.eventually.be.rejected;
      });
      it('should reject on list of empty object', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('[{}]');
        return chai.expect(tree.load('_')).to.eventually.be.rejected;
      });
      it('should reject on non-node-list format', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('["root", 0, ""]');
        return chai.expect(tree.load('_')).to.eventually.be.rejected;
      });
      it('should reset tree and resolve on empty list', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('[]');
        tree.nodes = { key: 1 };
        tree.root = 'root';
        return tree.load('_').then((status) => {
          chai.expect(status).to.equal('loaded');
          chai.expect(tree.nodes).to.be.empty;
          chai.expect(tree.root).to.be.undefined;
        });
      });
      it('should reset tree and insert single node', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('[{ "value": "root", "k": 100, "parent": "" }]');
        tree.nodes = { key: 1 };
        tree.root = 'root';
        return tree.load('_').then((status) => {
          chai.expect(status).to.equal('loaded');
          chai.expect(tree.nodes).to.be.eql({ root: { value: 'root', k: 100, parent: undefined, children: [] } });
          chai.expect(tree.root).to.be.undefined;
        });
      });
      it('should reset tree and insert two nodes', function () {
        this.deps("core/fs").readFile = () => Promise.resolve('[{ "value": "root", "k": 100, "parent": "" }, { "value": "child_1", "k": 50, "parent": "root" }]');
        tree.nodes = { key: 1 };
        tree.root = 'root';
        return tree.load('_').then((status) => {
          const root = { value: 'root', k: 100, parent: undefined, children: [] };
          const child_1 = { value: 'child_1', k: 50, parent: root, children: [] };
          root.children.push(child_1);
          chai.expect(status).to.equal('loaded');
          chai.expect(tree.nodes).to.be.eql({ root, child_1 });
          chai.expect(tree.root).to.be.undefined;
        });
      });
    });
    describe('#save', function (done) {
      it('should call writeFile with filename, stringified nodes, and isText set to true', function () {
        let filename;
        let data;
        let isText;
        this.deps("core/fs").writeFile = (_filename, _data, _options) => {
          filename = _filename;
          data = _data;
          isText = _options.isText;
          return Promise.resolve();
        }
        tree.nodes = [{ key: 1 }];
        tree.save('a filename', { isText: true });
        chai.expect(filename).to.be.equal('a filename');
        chai.expect(data).to.be.equal('[{"key":1}]');
        chai.expect(isText).to.be.true;
      });
    });
    describe('#isEmpty', function () {
      it('should return true for newly created tree', function () {
        chai.expect(tree.isEmpty()).to.be.true;
      });
      it('should return false after inserting a node', function () {
        tree.insertNodes([{ value: 'root', k: 100, parent: ''}]);
        chai.expect(tree.isEmpty()).to.be.false;
      });
      it('should return true after calling reset on a non-empty tree', function () {
        tree.insertNodes([{ value: 'root', k: 100, parent: ''}]);
        chai.expect(tree.isEmpty()).to.be.false;
        tree.reset();
        chai.expect(tree.isEmpty()).to.be.true;
      });
    });
    describe('#reset', function () {
      it('should empty tree and reset root', function () {
        tree.insertNodes([{ value: 'root', k: 100, parent: ''}]);
        chai.expect(tree.isEmpty()).to.be.false;
        chai.expect(tree.getRoot()).to.not.be.undefined;
        tree.reset();
        chai.expect(tree.isEmpty()).to.be.true;
        chai.expect(tree.getRoot()).to.be.undefined;
      });
    });
    describe('#anonymize', function () {
      it('should throw error if tree is empty', function () {
        chai.expect(tree.isEmpty()).to.be.true;
        chai.expect(tree.anonymize.bind(tree, 'any value')).to.throw(Error);
      });
      it('should return root if root is safe', function () {
        tree.insertNodes([{ value: 'root', k: 10, parent: '' }]);
        chai.expect(tree.anonymize('root', 10)).to.be.equal('root');
      });
      it('should return `_na` if root is unsafe', function () {
        tree.insertNodes([{ value: 'root', k: 1, parent: '' }]);
        chai.expect(tree.anonymize('root', 10)).to.be.equal('_na');
      });
      it('should go up and return `_na` if root is unsafe', function () {
        tree.insertNodes([{ value: 'root', k: 1, parent: '' }, { value: 'child_1', k: 1, parent: 'root' }]);
        chai.expect(tree.anonymize('child_1', 10)).to.be.equal('_na');
      });
      it('should return `_na` if key is not in tree', function () {
        tree.insertNodes([{ value: 'root', k: 0, parent: '' }]);
        chai.expect(tree.anonymize('not in tree')).to.be.equal('_na');
      });
      it('should return value if k is met and there are no other child', function () {
        tree.insertNodes([{ value: 'root', k: 10, parent: '' }, { value: 'child_1', k: 10, parent: 'root' }]);
        chai.expect(tree.anonymize('child_1', 5)).to.be.equal('child_1');
      });
      it('should return value if k is met and there are other children with safe k', function () {
        tree.insertNodes([{ value: 'root', k: 15, parent: '' }, { value: 'child_1', k: 10, parent: 'root' }, { value: 'child_2', k: 5, parent: 'root' }]);
        chai.expect(tree.anonymize('child_1', 5)).to.be.equal('child_1');
      });
      it('should return value if k is met and there are other children with unsafe k', function () {
        tree.insertNodes([{ value: 'root', k: 12, parent: '' }, { value: 'child_1', k: 10, parent: 'root' }, { value: 'child_2', k: 2, parent: 'root' }]);
        chai.expect(tree.anonymize('child_1', 5)).to.be.equal('child_1');
      });
      it('should return parent value if k is not met and if the sum of unsafe children meets k', function () {
        tree.insertNodes([
          { value: 'root', k: 15, parent: '' },
          { value: 'child_1', k: 10, parent: 'root' },
          { value: 'child_2', k: 2, parent: 'root' },
          { value: 'child_3', k: 1, parent: 'root' },
          { value: 'child_4', k: 2, parent: 'root' },
        ]);
        chai.expect(tree.anonymize('child_2', 5)).to.be.equal('root');
      });
      it('should not return parent value if k is not met and if the sum of unsafe children does not meets k', function () {
        tree.insertNodes([
          { value: 'root', k: 13, parent: '' },
          { value: 'child_1', k: 10, parent: 'root' },
          { value: 'child_2', k: 2, parent: 'root' },
          { value: 'child_3', k: 1, parent: 'root' },
        ]);
        chai.expect(tree.anonymize('child_2', 5)).to.be.equal('_na');
      });
      it('should return parent of parent value if k is not met and if the sum of unsafe children at each level meets k', function () {
        tree.insertNodes([
          { value: 'root', k: 20, parent: '' },
          { value: 'level_1_child_1', k: 5, parent: 'root' },
          { value: 'level_1_child_2', k: 2, parent: 'root' },
          { value: 'level_1_child_3', k: 13, parent: 'root' },
          { value: 'level_2_child_1', k: 2, parent: 'level_1_child_3' },
          { value: 'level_2_child_2', k: 1, parent: 'level_1_child_3' },
          { value: 'level_2_child_3', k: 10, parent: 'level_1_child_3' },
        ]);
        chai.expect(tree.anonymize('level_2_child_1', 5)).to.be.equal('root');
      });
      it('should not return parent of parent value if k is not met and if the sum of unsafe children at second level does not meet k', function () {
        tree.insertNodes([
          { value: 'root', k: 19, parent: '' },
          { value: 'level_1_child_1', k: 5, parent: 'root' },
          { value: 'level_1_child_2', k: 1, parent: 'root' },
          { value: 'level_1_child_3', k: 13, parent: 'root' },
          { value: 'level_2_child_1', k: 2, parent: 'level_1_child_3' },
          { value: 'level_2_child_2', k: 1, parent: 'level_1_child_3' },
          { value: 'level_2_child_3', k: 10, parent: 'level_1_child_3' },
        ]);
        chai.expect(tree.anonymize('level_2_child_1', 5)).to.be.equal('_na');
      });
    });
    describe('#getRoot', function () {
      it('should call isEmpty', function (done) {
        tree.root = 'dummy';
        tree.isEmpty = () => done();
        tree.getRoot();
      });
      it('should return undefined for empty tree', function () {
        tree.isEmpty = () => true;
        chai.expect(tree.getRoot()).to.be.undefined;
      });
      it('should return cached root if cached for non-empty tree', function () {
        tree.isEmpty = () => false;
        tree.root = 'dummy';
        chai.expect(tree.getRoot()).to.be.equal('dummy');
      });
      it('should find, set, and return root for single-node tree', function () {
        tree.isEmpty = () => false;
        tree.root = undefined;
        const node_1 = { value: 'root', k: 100, parent: undefined };
        tree.nodes = { root: node_1 };
        const root = tree.getRoot();
        chai.expect(root).to.be.eql(node_1);
        chai.expect(tree.root).to.be.eql(node_1);
      });
      it('should find, set, and return root for two-node tree (root first in nodes dictionary)', function () {
        tree.isEmpty = () => false;
        tree.root = undefined;
        const node_1 = { value: 'root', k: 100, parent: undefined };
        const node_2 = { value: 'child_1', k: 50, parent: node_1 };
        tree.nodes = { root: node_1, child_1: node_2 };
        const root = tree.getRoot();
        chai.expect(root).to.be.eql(node_1);
        chai.expect(tree.root).to.be.eql(node_1);
      });
      it('should find, set, and return root for two-node tree (root last in nodes dictionary)', function () {
        tree.isEmpty = () => false;
        tree.root = undefined;
        const node_1 = { value: 'root', k: 100, parent: undefined };
        const node_2 = { value: 'child_1', k: 50, parent: node_1 };
        tree.nodes = { child_1: node_2, root: node_1 };
        const root = tree.getRoot();
        chai.expect(root).to.be.eql(node_1);
        chai.expect(tree.root).to.be.eql(node_1);
      });
    });
    describe('#insertNodes', function () {
      it('empty list', function () {
        tree.insertNodes([]);
        chai.expect(tree.nodes).to.be.empty;
      });
      it('single node', function () {
        tree.insertNodes([{ value: 'root', k: 100, parent: '' }]);
        chai.expect(tree.nodes).to.contain.all.keys(['root']);
        chai.expect(tree.nodes.root.value).to.equal('root');
      });
      it('two nodes (root first)', function() {
        tree.insertNodes([{ value: 'root', k: 50, parent: '' }, { value: 'child_1', k: 25, parent: 'root' }]);
        const root = { value: 'root', k: 50, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 25, parent: root, children: [] };
        root.children.push(child_1);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
      });
      it('two nodes (root last)', function() {
        tree.insertNodes([{ value: 'child_1', k: 25, parent: 'root' }, { value: 'root', k: 51, parent: '' }]);
        const root = { value: 'root', k: 51, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 25, parent: root, children: [] };
        root.children.push(child_1);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
      });
      it('three nodes balanced (root first)', function() {
        tree.insertNodes([{ value: 'root', k: 80, parent: '' }, { value: 'child_1', k: 25, parent: 'root' }, { value: 'child_2', k: 50, parent: 'root' }]);
        const root = { value: 'root', k: 80, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 25, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: root, children: [] };
        root.children.push(child_1);
        root.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1, child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(root);
      });
      it('three nodes balanced (root in the middle)', function() {
        tree.insertNodes([{ value: 'child_1', k: 25, parent: 'root' }, { value: 'root', k: 80, parent: '' }, { value: 'child_2', k: 50, parent: 'root' }]);
        const root = { value: 'root', k: 80, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 25, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: root, children: [] };
        root.children.push(child_1);
        root.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1, child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(root);
      });
      it('three nodes balanced (root last)', function() {
        tree.insertNodes([{ value: 'child_1', k: 25, parent: 'root' }, { value: 'child_2', k: 50, parent: 'root' }, { value: 'root', k: 80, parent: '' }]);
        const root = { value: 'root', k: 80, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 25, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: root, children: [] };
        root.children.push(child_1);
        root.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1, child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(root);
      });
      it('should throw error on cyclic definition', function () {
        chai.expect(tree.insertNodes.bind(tree, [{ value: 'x', k: 0, parent: 'x' }])).to.throw(Error);
      });
      it('three nodes deep (root first)', function() {
        tree.insertNodes([{ value: 'root', k: 90, parent: '' }, { value: 'child_1', k: 75, parent: 'root' }, { value: 'child_2', k: 50, parent: 'child_1' }]);
        const root = { value: 'root', k: 90, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 75, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: child_1, children: [] };
        root.children.push(child_1);
        child_1.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1]);
        chai.expect(tree.nodes.child_1.children).to.deep.have.members([child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(child_1);
      });
      it('three nodes deep (root in the middle)', function() {
        tree.insertNodes([{ value: 'child_1', k: 75, parent: 'root' }, { value: 'root', k: 90, parent: '' }, { value: 'child_2', k: 50, parent: 'child_1' }]);
        const root = { value: 'root', k: 90, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 75, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: child_1, children: [] };
        root.children.push(child_1);
        child_1.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1]);
        chai.expect(tree.nodes.child_1.children).to.deep.have.members([child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(child_1);
      });
      it('three nodes deep (root last)', function() {
        tree.insertNodes([{ value: 'child_1', k: 75, parent: 'root' }, { value: 'child_2', k: 50, parent: 'child_1' }, { value: 'root', k: 90, parent: '' }]);
        const root = { value: 'root', k: 90, parent: undefined, children: [] };
        const child_1 = { value: 'child_1', k: 75, parent: root, children: [] };
        const child_2 = { value: 'child_2', k: 50, parent: child_1, children: [] };
        root.children.push(child_1);
        child_1.children.push(child_2);
        chai.expect(tree.nodes).to.contain.all.keys(['root', 'child_1', 'child_2']);
        chai.expect(tree.nodes.root.parent).to.be.undefined;
        chai.expect(tree.nodes.root.children).to.deep.have.members([child_1]);
        chai.expect(tree.nodes.child_1.children).to.deep.have.members([child_2]);
        chai.expect(tree.nodes.child_1.parent).to.eql(root);
        chai.expect(tree.nodes.child_2.parent).to.eql(child_1);
      });
      it('reset cached root', function() {
        tree.root = true;
        tree.insertNodes([{ value: 'root', k: 100, parent: '' }]);
        chai.expect(tree.root).to.be.undefined;
      });
      it('many nodes', function() {
        tree.insertNodes([
          {"value":"Any","k":0,"parent":""},
          {"value":"Other","k":3502,"parent":"Any"},
          {"value":"Desktop","k":0,"parent":"Any"},
          {"value":"Windows","k":11,"parent":"Desktop"},
          {"value":"Windows 7","k":132085,"parent":"Windows"},
          {"value":"Windows 10","k":110628,"parent":"Windows"},
          {"value":"Windows 8.1","k":45574,"parent":"Windows"},
          {"value":"Windows XP","k":11508,"parent":"Windows"},
          {"value":"Windows Vista","k":10957,"parent":"Windows"},
          {"value":"Windows 8","k":3797,"parent":"Windows"},
          {"value":"Windows 2000","k":20,"parent":"Windows"},
          {"value":"Windows 95","k":11,"parent":"Windows"},
          {"value":"Windows 98","k":11,"parent":"Windows"},
          {"value":"Windows NT 4.0","k":9,"parent":"Windows"},
          {"value":"Mac OS X","k":1944,"parent":"Desktop"},
          {"value":"Linux","k":105,"parent":"Desktop"},
          {"value":"Ubuntu","k":384,"parent":"Linux"},
          {"value":"Fedora","k":4,"parent":"Linux"},
          {"value":"Mobile","k":0,"parent":"Any"},
          {"value":"Android","k":2,"parent":"Mobile"},
          {"value":"iOS","k":1,"parent":"Mobile"},
        ]);
        chai.expect(Object.keys(tree.nodes).length).to.equal(21);
      });
    });
  }
)
