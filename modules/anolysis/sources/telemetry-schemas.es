// Import metrics
import freshtabSignalDefinitions from './metrics/freshtab';
import mobileSignalDefinitions from './metrics/mobile/favorites-migration-folders';
import cookieMonsterDefinitions from './metrics/cookie-monster';
import searchSignalDefinitions from './metrics/search';
import experimentsSignalDefinitions from './metrics/experiments';
import controlCenterSignalDefinitions from './metrics/control-center-interactions';
import abtestsSignalDefinition from './metrics/abtests';
import historyVisitsSignalDefinitions from './metrics/history-visits';
import webrequestPipelinePerformancesMetrics from './metrics/performance/webrequest-pipeline';

// Analyses
import retention from './analyses/retention';
import activeUser from './analyses/active-user';

import freshtabActivity from './analyses/freshtab-activity';
import freshtabSettings from './analyses/freshtab-settings';
import freshtabState from './analyses/freshtab-state';
import freshtabBackground from './analyses/freshtab-background';

import newsPagination from './analyses/news-pagination';
import newsSnippets from './analyses/news-snippets';

import cookieMonsterPerf from './analyses/cookie-monster';
import searchSchemas from './analyses/search';
import experimentsSchemas from './analyses/experiments';
import controlCenter from './analyses/control-center-interactions';
import mobile from './analyses/mobile/favorites-migration-folders';
import newsSearchSchemas from './analyses/news-search';
import historyVisitsSchemas from './analyses/history-visits';
import webrequestPipelinePerformances from './analyses/performance/webrequest-pipeline';

/**
 * This file is used to list all available metrics and analyses in use by
 * Anolysis. If you create new metrics or analyses, you should add them here as
 * well.
 */

// By default, metrics are not sent straight away to the backend (what we call
// "sendToBackend" signals), instead, they are stored by Anolysis for a day, then
// used by analyses to generate aggregated signals.
//
// This behavior can be overriden in each signal, by setting "sendToBackend" to true.
const metrics = [
  abtestsSignalDefinition,
  ...controlCenterSignalDefinitions,
  ...freshtabSignalDefinitions,
  ...mobileSignalDefinitions,
  ...cookieMonsterDefinitions,
  ...searchSignalDefinitions,
  ...experimentsSignalDefinitions,
  ...historyVisitsSignalDefinitions,
  webrequestPipelinePerformancesMetrics,
].map(schema => ({
  ...schema,
  sendToBackend: schema.sendToBackend || false,
}));

// Analyses are only generated once a day, and make use of metrics to generate
// aggregations. They are always "sendToBackend", which means that once generated
// they are sent to Cliqz' backend.
const analyses = [
  controlCenter,
  freshtabActivity,
  freshtabSettings,
  freshtabState,
  freshtabBackground,
  mobile,
  newsPagination,
  newsSnippets,
  cookieMonsterPerf,
  ...activeUser,
  ...retention,
  ...searchSchemas,
  ...experimentsSchemas,
  ...newsSearchSchemas,
  ...historyVisitsSchemas,
  webrequestPipelinePerformances,
].map(schema => ({
  ...schema,
  sendToBackend: true,
}));

export default [
  ...metrics,
  ...analyses,
];
