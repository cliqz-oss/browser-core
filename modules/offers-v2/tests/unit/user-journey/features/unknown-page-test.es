/* global chai */
/* global describeModule */
/* global require */
/* global sinon */
const commonMocks = require('../../utils/common');

export default describeModule('offers-v2/user-journey/features/unknown-page',
  () => ({
    ...commonMocks,
  }),
  () => {
    describe('user journey feature "unknown"', function () {
      let addEventMock;
      let eventHandler;
      let featurer;

      beforeEach(async function () {
        const EventHandler = (await this.system.import('offers-v2/event_handler')).default;
        eventHandler = new EventHandler();
        addEventMock = sinon.stub();
        const journeyCollector = { addEvent: addEventMock };
        const UnknownPage = this.module().default;
        featurer = new UnknownPage(eventHandler, journeyCollector);
        featurer.init();
      });

      afterEach(async function () {
        featurer.destroy();
      });

      it('/notify collector about a page', () => {
        eventHandler.onTabLocChanged({ url: 'http://some.domain.com/' });

        chai.expect(addEventMock).to.be.called;
        chai.expect(addEventMock.firstCall.args).to.eql([{ feature: 'unk' }]);
      });
    });
  });
