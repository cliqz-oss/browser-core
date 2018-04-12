// Import metrics
import dropdownSignalDefinitions from './metrics/dropdown';
import freshtabSignalDefinitions from './metrics/freshtab';
import mobileSignalDefinitions from './metrics/mobile';

// Analyses
import freshtabSettings from './analyses/freshtab-settings';
import freshtabState from './analyses/freshtab-state';
import newsPagination from './analyses/news-pagination';
import newsSnippets from './analyses/news-snippets';
import retentionSchemas from './analyses/retention';

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
  ...dropdownSignalDefinitions,
  ...freshtabSignalDefinitions,
  ...mobileSignalDefinitions,
].map(schema => ({
  ...schema,
  sendToBackend: schema.sendToBackend || false,
}));

// Analyses are only generated once a day, and make use of metrics to generate
// aggregations. They are always "sendToBackend", which means that once generated
// they are sent to Cliqz' backend.
const analyses = [
  freshtabSettings,
  freshtabState,
  newsPagination,
  newsSnippets,
  ...retentionSchemas,
].map(schema => ({
  ...schema,
  sendToBackend: true,
}));

export default [
  ...metrics,
  ...analyses,
];
