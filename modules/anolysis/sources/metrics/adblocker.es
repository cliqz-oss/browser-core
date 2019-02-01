import inject from '../../core/kord/inject';

export default [
  {
    name: 'metrics.adblocker.enabled',
    needsGid: true,
    sendToBackend: true,
    offsets: [0],
    version: 1,
    description: 'Counts how many users have the adblocker enabled',
    generate: async () => {
      try {
        const enabled = await inject.module('adblocker').action('isEnabled');
        return [{
          enabled: !!enabled,
        }];
      } catch (ex) {
        // We should always send a result for this signal, even if adblocker's
        // state cannot be retrieved (background is disabled, state is broken,
        // etc.)
        return [{
          enabled: false,
        }];
      }
    },
    schema: {
      required: ['enabled'],
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  },
];
