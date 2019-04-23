import CONFIG from './config';
import prefs from './prefs';
import { isSearchServiceReady } from './search-engines';
import { service as logos } from './services/logos';
import { service as domainInfo } from './services/domain-info';
import { service as pacemaker } from './services/pacemaker';
import { service as telemetry } from './services/telemetry';
import { service as session } from './services/session';
import { service as cliqzConfig } from './services/cliqz-config';

const services = {
  logos,
  telemetry,
  // IP driven configuration
  'cliqz-config': cliqzConfig,
  session,
  'search-services': isSearchServiceReady,
  domainInfo,
  pacemaker,
};

if (CONFIG.environment !== 'production') {
  services['test-helpers'] = function testHelpers() {
    testHelpers.prefs = prefs;
  };
}

export default services;
