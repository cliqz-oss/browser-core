

const internalProtocols = new Set(['chrome', 'resource', 'moz-extension']);

export function skipInternalProtocols(state) {
  if (state.sourceUrlParts && internalProtocols.has(state.sourceUrlParts.protocol)) {
    return false;
  }
  if (state.urlParts && internalProtocols.has(state.urlParts.protocol)) {
    return false;
  }
  return true;
}

export function checkSameGeneralDomain(state) {
  const gd1 = state.urlParts.generalDomain;
  const gd2 = state.sourceUrlParts.generalDomain;
  return gd1 !== gd2 && gd1 !== null && gd2 !== null && gd1.split('.')[0] !== gd2.split('.')[0];
}
