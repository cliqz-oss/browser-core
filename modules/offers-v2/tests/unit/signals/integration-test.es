/* global chai */
/* global describeModule */
/* global sinon */
const commonMocks = require('../utils/common');
const persistenceMocks = require('../utils/persistence');
const fixture = require('../utils/offers/data');
const waitFor = require('../utils/waitfor');

export default describeModule('offers-v2/signals/signals_handler',
  () => ({
    ...commonMocks,
    ...persistenceMocks,
  }),
  () => {
    describe('/Integration-style signal tests', function () {
      let bg;
      let sendMock;

      beforeEach(async function () {
        persistenceMocks.lib.reset();
        bg = (await this.system.import('offers-v2/background')).default;
        await bg.init();
        sendMock = sinon.stub(bg.signalsHandler.sender, 'httpPost');
      });

      it('/Send signal if an offer is erased', async () => {
        const odb = bg.offersDB;
        const o = fixture.VALID_OFFER_OBJ;
        odb.addOfferObject(o.offer_id, o);
        sendMock.reset();

        odb.eraseOfferObject(o.offer_id);

        await waitFor(() => sendMock.called);
        const signal = JSON.parse(sendMock.firstCall.args[2]);
        chai.expect(signal).to.have.nested.include({
          'payload.data.c_data.offers[0].offer_data[0].origin_data.offer_expired': 1
        });
      });
    });
  });
