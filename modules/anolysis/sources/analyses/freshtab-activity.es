export default {
  name: 'freshtab-activity',
  version: 1,
  needsGid: true,
  sendToBackend: true,
  generate: ({ records }) => {
    const shows = records.get('freshtab.home.show').length;
    const topSiteClicks = records.get('freshtab.home.click.topsite').length;
    const customSiteClicks = records.get('freshtab.home.click.favorite').length;
    return [{
      shows,
      clicks: {
        topSites: topSiteClicks,
        customSites: customSiteClicks,
      }
    }];
  },
  schema: {
    required: ['shows', 'clicks'],
    properties: {
      shows: { type: 'integer', minimum: 0 },
      clicks: {
        required: ['topSites', 'customSites'],
        properties: {
          topSites: { type: 'integer', minimum: 0 },
          // always 0 for mobile
          customSites: { type: 'integer', minimum: 0 },
        }
      },
    }
  },
};
