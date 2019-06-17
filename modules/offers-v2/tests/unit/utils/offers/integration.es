const waitFor = require('../waitfor');

async function initializeBackground(system) {
  const bg = (await system.import('offers-v2/background')).default;
  await bg.init();
  bg.actions.registerRealEstate({ realEstateID: 'offers-cc' });
  return bg;
}

function activateIntentWithOffers(bg, intent, offers) {
  bg.offersHandler.intentOffersHandler.setIntentOffers(intent, offers);
  bg.intentHandler.activateIntent(intent);
}

async function visitPageWithOffer(bg, url) {
  bg.eventHandler.tabToLastUrl.reset();
  const nEvents = bg.offersHandler.nEventsProcessed;
  await bg.eventHandler.onTabLocChanged({ url });
  await waitFor(() => bg.offersHandler.nEventsProcessed > nEvents);
}

module.exports = {
  activateIntentWithOffers,
  initializeBackground,
  visitPageWithOffer,
};
