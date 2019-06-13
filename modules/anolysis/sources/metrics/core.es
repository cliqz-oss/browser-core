import inject from '../../core/kord/inject';
import prefs from '../../core/prefs';

export default [
  /**
   * Extension version, sent on each day the user is active.
   */
  {
    name: 'metrics.core.version.core',
    needsGid: false,
    sendToBackend: true,
    version: 1,
    generate: () => [{
      version: inject.app.version,
    }],
    schema: {
      required: ['version'],
      properties: {
        version: { type: 'string' },
      },
    },
  },
  /**
   * Browser version, sent on each day the user is active.
   */
  {
    name: 'metrics.core.version.distribution',
    needsGid: false,
    sendToBackend: true,
    version: 1,
    generate: () => [{
      version: prefs.get('distribution.version', '', ''),
    }],
    schema: {
      required: ['version'],
      properties: {
        version: { type: 'string' },
      },
    },
  }
];
