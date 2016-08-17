Components.utils.import('resource://gre/modules/Services.jsm');

export default function getEngines() {
  return Services.search.getEngines();
}
