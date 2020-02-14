/* eslint-disable import/prefer-default-export */
export function mock() {
  const stats = { related: [], touched: [], tooltip: [], owned: [] };
  return {
    mock: true,
    stats: () => ({ ...stats }),
    statsCached: () => ({ ...stats }),
    invalidateCache: () => { },
  };
}
