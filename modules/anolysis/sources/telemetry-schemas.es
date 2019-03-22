import Task from './internals/task';
import logger from './internals/logger';

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
import generalPerformancesMetrics from './metrics/performance/general';
import internalAnolysisMetrics from './metrics/internals/anolysis';
import coreMetrics from './metrics/core';
import antitrackingTokenMetrics from './metrics/performance/antitracking-tokens';
import consentricDefinitions from './metrics/consentric';
import moduleStartupPerformanceMetrics from './metrics/performance/modules-startup';
import resourceLoadersPerformanceMetrics from './metrics/performance/resource-loaders';
import adblockerMetrics from './metrics/adblocker';

// Analyses
import retention from './analyses/retention';
import activeUser from './analyses/active-user';

import freshtabActivity from './analyses/freshtab-activity';
import freshtabSettings from './analyses/freshtab-settings';
import freshtabBackground from './analyses/freshtab-background';

import newsPagination from './analyses/news-pagination';
import newsSnippets from './analyses/news-snippets';

import cookieMonsterPerf from './analyses/cookie-monster';
import searchSchemas from './analyses/search';
import dropdownSchemas from './analyses/experiments/dropdown';
import serpSchemas from './analyses/experiments/serp';
import serpAlternativeSchemas from './analyses/experiments/serp-alternative';
import serpRetentionWeeklySchemas from './analyses/experiments/serp-retention-weekly';
import controlCenter from './analyses/control-center-interactions';
import mobile from './analyses/mobile/favorites-migration-folders';
import newsSearchSchemas from './analyses/news-search';
import historyVisitsSchemas from './analyses/history-visits';
import webrequestPipelinePerformances from './analyses/performance/webrequest-pipeline';
import generalPerformances from './analyses/performance/general';
import antitrackingTokenAnalyses from './analyses/performance/antitracking-tokens';
import consentric from './analyses/consentric';

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
const metrics = () => [
  abtestsSignalDefinition,
  ...controlCenterSignalDefinitions,
  ...freshtabSignalDefinitions(),
  ...mobileSignalDefinitions,
  ...cookieMonsterDefinitions,
  ...searchSignalDefinitions(),
  ...experimentsSignalDefinitions,
  ...historyVisitsSignalDefinitions,
  ...internalAnolysisMetrics,
  ...coreMetrics,
  webrequestPipelinePerformancesMetrics,
  generalPerformancesMetrics,
  ...antitrackingTokenMetrics,
  ...consentricDefinitions,
  ...adblockerMetrics,
  moduleStartupPerformanceMetrics,
  resourceLoadersPerformanceMetrics,
].map(schema => ({
  ...schema,
  description: schema.description || 'missing description',
  sendToBackend: schema.sendToBackend || false,
}));

// Analyses are only generated once a day, and make use of metrics to generate
// aggregations. They are always "sendToBackend", which means that once generated
// they are sent to Cliqz' backend.
const analyses = () => [
  controlCenter,
  freshtabActivity,
  freshtabSettings,
  freshtabBackground,
  mobile,
  newsPagination,
  newsSnippets,
  cookieMonsterPerf,
  ...activeUser,
  ...retention,
  ...searchSchemas(),
  ...dropdownSchemas,
  ...serpSchemas(),
  ...serpAlternativeSchemas,
  ...serpRetentionWeeklySchemas,
  ...newsSearchSchemas(),
  ...historyVisitsSchemas,
  webrequestPipelinePerformances,
  generalPerformances,
  ...antitrackingTokenAnalyses,
  ...consentric(),
].map(schema => ({
  ...schema,
  description: schema.description || 'missing description',
  sendToBackend: true,
}));

function createTasksFromDefinitions(definitions) {
  const tasks = [];
  for (let i = 0; i < definitions.length; i += 1) {
    const definition = definitions[i];
    const name = definition.name;
    logger.debug('Register definition', name);
    tasks.push(new Task(definition));
  }
  return tasks;
}

class SchemasManager {
  constructor() {
    this._metrics = null;
    this._analyses = null;
  }

  get metrics() {
    if (this._metrics === null) {
      this._metrics = createTasksFromDefinitions(metrics());
    }

    return this._metrics;
  }

  get analyses() {
    if (this._analyses === null) {
      this._analyses = createTasksFromDefinitions(analyses());
    }

    return this._analyses;
  }

  get schemas() {
    return [
      ...this.metrics,
      ...this.analyses,
    ];
  }
}

export default new SchemasManager();
