
const notImplemented = () => Promise.reject(new Error('not implemented'));

export default {
  get: notImplemented,
  getAll: notImplemented,
  set: notImplemented,
  remove: notImplemented,
  getAllCookieStores: notImplemented,
};
