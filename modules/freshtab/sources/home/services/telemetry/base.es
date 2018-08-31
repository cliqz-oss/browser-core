import cliqz from '../../cliqz';

/**
 * Automatically derive anolysis schema name from `signal`.
 * Format should be: 'freshtab.{type}.{action}[.{target}[.{element}]]
 *
 * The complete list of signals can be found in:
 * ./modules/anolysis/sources/metrics/
 */
function mkAnolysisSchemaName({ type, action, view = '', target }) {
  let schemaName = view === '' ? `freshtab.${type}.${action}` : `freshtab.${type}.${view}.${action}`;

  if (target) {
    schemaName = `${schemaName}.${target}`;
  }
  return schemaName;
}

export default function (signal) {
  cliqz.core.sendTelemetry(
    { ...signal, version: '2.0' },
    false, // not instant push
    mkAnolysisSchemaName(signal),
  );
}
