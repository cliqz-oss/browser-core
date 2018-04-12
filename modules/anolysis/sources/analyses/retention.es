
const retentionSchema = {
  properties: {
    units_active: {
      type: 'number', // 0 for inactive, 1 for active
    },
    offset: {
      type: 'number',
    },
  },
};

/**
 * Retention signals enable the analysis the retention of a group of people over
 * time, without allowing tracking of any individual in the group.
 *
 * All retention signals have the same schema, but should be interpreted on
 * different temporal scales (daily, weekly and monthly basis).
 */
export default [
  {
    name: 'retention-daily',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    schema: retentionSchema,
  },
  {
    name: 'retention-weekly',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    schema: retentionSchema,
  },
  {
    name: 'retention-monthly',
    version: 1,
    needsGid: true,
    sendToBackend: true,
    schema: retentionSchema,
  },
];
