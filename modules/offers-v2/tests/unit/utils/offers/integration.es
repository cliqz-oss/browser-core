/* global chai */
const waitFor = require('../waitfor');
const fixture = require('./data');
const persistence = require('../persistence');

let Intent;
let Category;

async function initializeBackground(system, { cleanupPersistence = true } = {}) {
  Intent = (await system.import('offers-v2/intent/intent')).default;
  Category = (await system.import('offers-v2/categories/category')).default;
  if (cleanupPersistence) {
    persistence.lib.reset();
  }
  const bg = (await system.import('offers-v2/background')).default;
  await bg.init();
  bg.actions.registerRealEstate({ realEstateID: 'offers-cc' });
  return bg;
}

function activateIntentWithOffers(bg, intent, offers) {
  const intentObj = (typeof intent === 'string') && Intent
    ? new Intent(intent, 48 * 60 * 60)
    : intent;
  bg.offersHandler.intentOffersHandler.setIntentOffers(intentObj, offers);
  bg.intentHandler.activateIntent(intentObj);
}

function activateCategory(bg, category) {
  const cat = { ...fixture.VALID_CATEGORY, ...category };
  const catObj = new Category(
    cat.name,
    cat.patterns,
    cat.version,
    cat.timeRangeSecs,
    cat.activationData
  );
  if (!bg.categoryHandler.buildResources) {
    bg.categoryHandler._acquireBuildResources();
  }
  bg.categoryHandler.addCategory(catObj);
  bg.categoryHandler.build();
  catObj.hit();
}

async function visitPageWithOffer(bg, url) {
  bg.eventHandler.tabToLastUrl.reset();
  const nEvents = bg.offersHandler.nEventsProcessed;
  await bg.eventHandler.onTabLocChanged({ url });
  await waitFor(() => bg.offersHandler.nEventsProcessed > nEvents);
}

function getSentSignalForOffer(offerId, origin, httpPostMock) {
  const sentSignals = [];
  const allSentSignals = httpPostMock.args.map(args => JSON.parse(args[2]));
  for (const sigEnv of allSentSignals) {
    if (!sigEnv.payload.data.c_data) {
      continue; // eslint-disable-line no-continue
    }
    for (const someOfferSignal of sigEnv.payload.data.c_data.offers) {
      if (someOfferSignal.offer_id === offerId) {
        for (const odata of someOfferSignal.offer_data) {
          if (odata.origin === origin) {
            sentSignals.push(odata.origin_data);
          }
        }
      }
    }
  }
  chai.expect(sentSignals, 'Exactly one sent signal').to.have.length(1);
  return sentSignals[0];
}

module.exports = {
  activateCategory,
  activateIntentWithOffers,
  getSentSignalForOffer,
  initializeBackground,
  visitPageWithOffer,
};
