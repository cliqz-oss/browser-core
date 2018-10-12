import { generateRetention } from '../retention';
import { WEEK_FORMAT } from '../../internals/synchronized-date';
import prefs from '../../../core/prefs';


// copy & paste with adaptations from '../retention'
export default [
  {
    name: 'analyses.experiments.serp.retention-weekly',
    version: 1,
    needsGid: false,
    sendToBackend: true,
    offsets: [0],
    generate: ({ retention, dateMoment }) => {
      // `group` for this AB test is assigned right away on first browser start; cannot use
      // 'metrics.experiments.serp.state' as there are no records for offset 0 available
      const group = prefs.get('serp_test', null);
      if (!group) {
        return [];
      }

      // If this is not the first day we are active during this week, then we
      // should not generate retention signals again.
      const week = dateMoment.format(WEEK_FORMAT);
      if (retention.weekly[week].length !== 1) {
        return [];
      }

      return generateRetention({
        state: retention.weekly,
        date: dateMoment,
        timeframe: 10,
        getPreviousUnit: (d, offset) => d.subtract(offset, 'weeks').format(WEEK_FORMAT),
        initialOffset: 1,
      }).map(signal => ({ ...signal, group }));
    },
    schema: {
      required: ['group', 'units_active', 'offset'],
      properties: {
        group: { enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', null] },
        units_active: {
          type: 'integer', // 0 for inactive, 1 for active
          minimum: 0,
        },
        offset: {
          type: 'integer',
          minimum: 0,
        },
      },
    },
  },
];
