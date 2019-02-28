import inject from '../../core/kord/inject';
import logger from '../internals/logger';
import { CLICKS_TARGETS, UPLOADS_TYPES, VISITS_PAGES } from '../metrics/cliqz-for-friends';
import { counterSchema, count } from '../analyses-utils';

export default () => [
  {
    name: 'analysis.cliqzForFriends.interactions',
    description: 'Aggregates interactions with cliqz-for-friends',
    needsGid: true,
    sendToBackend: true,
    version: 1,
    generate: async ({ records }) => {
      const visitSignals = records.get('metrics.cliqzForFriends.visit');
      const clickSignals = records.get('metrics.cliqzForFriends.click');
      const uploadSignals = records.get('metrics.cliqzForFriends.upload');

      // Does not generate any telemetry signal if there was no user activity
      if (visitSignals.length === 0
        && clickSignals.length === 0
        && uploadSignals.length === 0
      ) {
        return [];
      }

      // If there is any activity in cliqz-for-friends (meaning that the user
      // has explicitely visited the page), then we send this specific
      // aggregated signal along with the cliqz-for-friend refId (if available).
      let refId;
      try {
        refId = await inject.module('cliqz-for-friends').action('getRefId');
      } catch (ex) {
        logger.error('Could not retrieve cliqz-for-friend refId', ex);
      }

      return [{
        refId,
        // Aggregate pages visited, elements clicked and media uploaded. Count
        // the number of occurrences of each of them.
        clicks: count(clickSignals.map(({ target }) => target)),
        uploads: count(uploadSignals.map(({ type }) => type)),
        visits: count(visitSignals.map(({ page }) => page)),
      }];
    },
    schema: {
      required: ['refId', 'visits'],
      properties: {
        refId: { type: 'string' },
        clicks: counterSchema(CLICKS_TARGETS),
        uploads: counterSchema(UPLOADS_TYPES),
        visits: counterSchema(VISITS_PAGES),
      },
    },
  },
];
