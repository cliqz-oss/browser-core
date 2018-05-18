/* global chai */
/* global describeModule */
/* global require */

function insert(binStr, leafValue, tree) {
  if (binStr.length === 0) {
    return leafValue;
  }
  if (tree === null) {
    tree = [null, null];
  }
  const head = binStr[0];
  const tail = binStr.substring(1);

  if (head === '0') {
    return [insert(tail, leafValue, tree[0]), tree[1]];
  } else {
    return [tree[0], insert(tail, leafValue, tree[1])];
  }
}

const MOCK_LOOKUP_TREE = {
  tree: [null, null],
  countries: ['A', 'B', 'CN', 'TW'],
}

class MockResource {
  constructor(name, opts) {

  }
  load() {
    return Promise.resolve(MOCK_LOOKUP_TREE);
  }
}

export default describeModule('antitracking/geoip',
  () => ({
    'core/resource-loader': {
      Resource: MockResource,
    },
  }),
  function() {
    describe('ipv4ToBinaryString', function() {
      let ipv4ToBinaryString;

      beforeEach(function() {
        ipv4ToBinaryString = this.module().ipv4ToBinaryString
      });

      const validIpAddresses = {
        '127.0.0.1': '01111111000000000000000000000001',
        '1.1.1.1': '00000001000000010000000100000001',
        '255.255.255.255': '11111111111111111111111111111111',
      };

      Object.keys(validIpAddresses).forEach((address) => {
        it(`converts dot-seperated ips to binary string (${address})`, () => {
          chai.expect(ipv4ToBinaryString(address)).to.eql(validIpAddresses[address], `ipv4ToBinaryString('${address}')`);
        });
      });

      const invalidIpAddresses = [
        'a.b.c.d',
        '127.0',
        '01111111000000000000000000000001',
        undefined,
        false,
        1234,
        '304.0.0.1',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
      ]

      invalidIpAddresses.forEach((address) => {
        it(`invalid ip (${address})`, () => {
          const testFn = ipv4ToBinaryString.bind(address);
          chai.expect(testFn).to.throw();
        });
      })
    });

    describe('geoip.lookup', function() {
      let geoip;

      beforeEach(function() {
        const mod = this.module();
        geoip = new (mod.default)();
        // build mock tree
        MOCK_LOOKUP_TREE.tree = [null, null];
        // 127.0.0.0/8 -> null
        MOCK_LOOKUP_TREE.tree = insert(mod.ipv4ToBinaryString('127.0.0.1').substring(0, 8), null, MOCK_LOOKUP_TREE.tree)
        // 128.0.0.0/8 -> A
        MOCK_LOOKUP_TREE.tree = insert(mod.ipv4ToBinaryString('126.0.0.1').substring(0, 8), 0, MOCK_LOOKUP_TREE.tree)
        // 1.34.0.0/32 -> CN
        MOCK_LOOKUP_TREE.tree = insert(mod.ipv4ToBinaryString('1.34.0.0'), 2, MOCK_LOOKUP_TREE.tree)
        // 1.34.0.1/32 -> TN
        MOCK_LOOKUP_TREE.tree = insert(mod.ipv4ToBinaryString('1.34.0.1'), 3, MOCK_LOOKUP_TREE.tree)
        // 1.34.1.0/24 -> B
        MOCK_LOOKUP_TREE.tree = insert(mod.ipv4ToBinaryString('1.34.1.0').substring(0, 24), 1, MOCK_LOOKUP_TREE.tree)

        return geoip.load();
      });

      const testIpAddresses = {
        '127.0.24.1': null,
        '126.4.6.1': 'A',
        '1.34.0.50': null,
        '1.34.1.50': 'B',
        '1.34.0.0': 'CN',
        '1.34.0.1': 'TW',
      };

      Object.keys(testIpAddresses).forEach((address) => {
        it('returns a country code for the ip address', () => {
          chai.expect(geoip.lookup(address)).to.eql(testIpAddresses[address], JSON.stringify(MOCK_LOOKUP_TREE.tree));
        });
      });
    });
  }
)