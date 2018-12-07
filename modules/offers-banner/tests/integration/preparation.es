import {
  CliqzEvents,
  newTab,
  queryHTML,
  testServer,
  waitFor,
} from '../../../tests/core/integration/helpers';

import {
  getPage,
  mockOffersBackend,
  triggerKeyword,
} from '../../../tests/core/integration/offers-helpers';

export default async function triggerOffer(dest) {
  await mockOffersBackend({ dest });

  // Simulate location change, to trigger offers' expression evaluation.
  CliqzEvents.pub('content:location-change', {
    url: 'https://fake.url.com',
    windowTreeInformation: { tabId: 0 },
  });

  await waitFor(() => testServer.hasHit('/api/v1/categories'));
  await waitFor(() => testServer.hasHit('/api/v1/loadsubtriggers'));

  const pageUrl = getPage(`landing?q=${triggerKeyword}`);
  const tabId = await newTab(pageUrl, { focus: true });
  await waitFor(() => testServer.hasHit('/api/v1/offers'), 15000);
  await waitFor(async () =>
    Boolean((await queryHTML(pageUrl, 'p', 'innerText')).length) === true);

  return tabId;
}
