const PERMISSIONS = {
  ACCESS_FINE_LOCATION: 'geolocation'
};
const RESULTS = {
  GRANTED: 'granted',
  REJECTED: 'rejectd'
};

export default {
  PERMISSIONS,
  RESULTS,
  check: type => Promise.resolve(type in navigator ? RESULTS.GRANTED : RESULTS.REJECTED),
  request: () => Promise.resolve(RESULTS.REJECTED)
};
