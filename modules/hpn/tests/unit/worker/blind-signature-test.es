/* global chai */
/* global describeModule */
const expect = chai.expect;

export default describeModule('hpn/worker/blind-signature',
  () => {
    return {
      'BigInt': {},
      '../../core/encoding': {},
      '../../platform/crypto': {},
    };
  },

  () => {
    describe('h2d', () => {

      let h2d;
      beforeEach(function () {
        const module = this.module();
        h2d = module.h2d;
      });

      it('should handle empty inputs', function() {
        expect(h2d('')).to.equal('0');
      });
      
      it('should pass basic tests', function() {
        expect(h2d('0')).to.equal('0');
        expect(h2d('1')).to.equal('1');
        expect(h2d('9')).to.equal('9');
        expect(h2d('a')).to.equal('10');
        expect(h2d('f')).to.equal('15');
        
        expect(h2d('ff')).to.equal('255');
        expect(h2d('10')).to.equal('16');
        expect(h2d('100')).to.equal('256');
      });
      
      it('should correctly handle the public key', function() {

        const input = 'c17a38857bdba0a1c2820349d14345bd941f0d68b48cd705d64047b61c6294cbba2c1fe116b48c43efc5813a95137e9c09ecd61342b551cc2660656cbaac5cbea97cd917c299851506ba09dd4146f2a9deb587d4e453a4e370b9e79a799791f3945f108a570250108ee120a3f65119dfff0525ba02ba94eac4452aee7c1481a3593a218a31d0d405924ed6d5b82d21f8963f4801971c109e472959892a8a50de19b35a00eaa30c678b8350cfed039ec49f08602ea4a6890f18df6a3268b17e62ebbe2b81d1db646b601c1dccf6385ce8714d3dc9ad5202f082d52d4703214a7c9aeaafced3a7aea2e362d61d26e5e46b59e31194949d5277a52d253c40dcbb2d';

        const expected = '24424262174689288351651785931616152641305093117477536572776010029984980853597353765474584643620286145450091745844135927010048342867833060068602844292696577602666658343407987385338565229219094389690024086650425909685144309981801138639587960369485639949538986059057511301162335296328720218661839906740596895636849301773104571744055548871655483516161142297965173102313332279347901451976008382253125369149801472256784268691951830843461339870996896605656141998715693695543236785241812227607395594343201648338725972879841523534328663356313010941308981556001289433692320512581485363502769864822931128460830113624552929803053';

        const actual = h2d(input);
        expect(actual).to.equal(expected);
      });
    });
  }
);
