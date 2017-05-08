const SCHEMAS = {
  new_install: {
    needs_gid: true,
    instantPush: true,
    schema: {},
  },

  // TODO: This message might not have enough time to be sent on uninstall.
  // instantPush will still be queued in the SignalQueue. Maybe we need to
  // differentiate? Or maybe the queue needs to send messages more aggressively.
  activity_stop: {
    needs_gid: true,
    instantPush: true,
    schema: {
      action: 'string',
    },
  },

  // This telemetry signal is created by the abtests analysis.
  // It sends each AB test of the user atomically in a signal.
  abtests: {
    needs_gid: true,
    instantPush: true,
    schema: {
      abtest: 'string',
    },
  },

  // Sends no data, but pings once a day the backend along with the GID.
  ping: {
    needs_gid: true,
    instantPush: true,
    schema: {},
  },

  // Retention signals: daily, weekly and monthly
  retention_daily: {
    needs_gid: true,
    instantPush: true,
    schema: {
      units_active: 'number', // 0 for inactive, 1 for active
      offset: 'number',
    },
  },
  retention_weekly: {
    needs_gid: true,
    instantPush: true,
    schema: {
      units_active: 'number',
      offset: 'number',
    },
  },
  retention_monthly: {
    needs_gid: true,
    instantPush: true,
    schema: {
      units_active: 'number',
      offset: 'number',
    },
  },
};


export default SCHEMAS;
