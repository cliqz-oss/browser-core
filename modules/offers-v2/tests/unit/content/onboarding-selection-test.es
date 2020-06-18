/* global chai */
/* global describeModule */
/* global sinon */

const { JSDOM } = require('jsdom');

const ONBOARDING_URL = 'https://onboarding.myoffrz.com';
const HREF = '#done';
const REMOVED_OFFERS = ['o1', 'o2', 'o3'];
const REMOVE_OFFERS_BTN_ID = 'remove-offers-btn';
const ONBOARDING_OFFER_SELECTION_HTML = `
<body>
  <div>
    <a id="${REMOVE_OFFERS_BTN_ID}" type="button" href=${HREF}></a>
  </div>
</body>
`;

export default describeModule('offers-v2/content/onboarding-selection',
  () => ({}),
  () => {
    describe('/when the onboarding-selection content script is called', () => {
      let removeUnselectedOnboardingOffers;
      let cliqzMock;
      let actionMock;
      let windowMock;
      let addEventListener;
      let mountOnboarding;

      beforeEach(function (done) {
        removeUnselectedOnboardingOffers = this.module().default;
        actionMock = sinon.spy();
        cliqzMock = { app: { modules: { 'offers-v2': { action: actionMock } } } };
        windowMock = new JSDOM(ONBOARDING_OFFER_SELECTION_HTML, { url: ONBOARDING_URL }).window;
        addEventListener = windowMock.addEventListener.bind(windowMock); // keep original
        sinon.spy(windowMock, 'addEventListener');
        sinon.spy(windowMock, 'removeEventListener');
        const actions = removeUnselectedOnboardingOffers(windowMock, {}, cliqzMock);
        mountOnboarding = actions['mount-onboarding'];
        addEventListener('DOMContentLoaded', () => done(), { once: true }); // bypass spy
      });

      afterEach(() => {
        actionMock.resetHistory();
        windowMock.addEventListener.restore();
        windowMock.removeEventListener.restore();
        windowMock.close();
      });

      it('should return an `mount-onboarding` content action', () => {
        chai.expect(typeof mountOnboarding).to.equal('function');
      });

      describe('/when the `mount-onboarding` content action is called', () => {
        beforeEach(async () => {
          sinon.spy(windowMock.document.body, 'addEventListener');
          sinon.spy(windowMock.document.body, 'removeEventListener');
          await mountOnboarding();
        });

        afterEach(() => {
          windowMock.document.body.addEventListener.restore();
          windowMock.document.body.removeEventListener.restore();
        });

        it('/should register a `click` handler on the document body', () => {
          chai.expect(windowMock.document.body.addEventListener).to.have.been.calledWith('click');
        });

        describe('/when the `mount-onboarding` content action is called again', () => {
          beforeEach(async () => {
            windowMock.document.body.addEventListener.resetHistory();
            await mountOnboarding();
          });

          it('should not additionally register a `click` handler on the document body', () => {
            chai.expect(windowMock.document.body.addEventListener).not.to.have.been.calledWith('click');
          });
        });

        describe('/on the window `unload` event', () => {
          beforeEach((done) => {
            addEventListener('unload', () => done(), { once: true }); // bypass spy
            const unload = new windowMock.Event('unload');
            windowMock.dispatchEvent(unload);
          });

          it('should unregister the `click` handler', () => {
            chai.expect(windowMock.document.body.removeEventListener).to.have.been.calledWith('click');
          });
        });

        describe('/on a click event', () => {
          beforeEach(function (done) {
            addEventListener('click', () => done(), { once: true }); // bypass spy
            const click = new windowMock.MouseEvent('click', {
              view: windowMock,
              bubbles: true,
              cancelable: true
            });
            const removeOffersBtn = windowMock.document.querySelector(`#${REMOVE_OFFERS_BTN_ID}`);
            removeOffersBtn.dispatchEvent(click);
          });

          it('/should not emit any action', () => {
            chai.expect(actionMock).not.to.have.been.called;
          });

          it('/should not unregister the `click` handler', () => {
            chai.expect(windowMock.document.body.removeEventListener).not.to.have.been.calledWith('click');
          });
        });

        describe('when the `offersToRemove` attribute on the <body> element includes the list of offer ids to remove', () => {
          beforeEach(() => {
            windowMock.document.body.dataset.offersToRemove = REMOVED_OFFERS.join();
          });

          describe('/on a click event', () => {
            beforeEach(function (done) {
              addEventListener('click', () => done(), { once: true }); // bypass spy
              const click = new windowMock.MouseEvent('click', {
                view: windowMock,
                bubbles: true,
                cancelable: true
              });
              const removeOffersBtn = windowMock.document.querySelector(`#${REMOVE_OFFERS_BTN_ID}`);
              removeOffersBtn.dispatchEvent(click);
            });

            it('/should emit a `deleteOnboardingOffers` action with the list of offer ids', () => {
              chai.expect(actionMock).to.have.been.calledWithExactly(
                'deleteOnboardingOffers',
                REMOVED_OFFERS
              );
            });

            it('/should unregister the `click` handler', () => {
              chai.expect(windowMock.document.body.removeEventListener).to.have.been.calledWith('click');
            });
          });
        });
      });
    });
  });
