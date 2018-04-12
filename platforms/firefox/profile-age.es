/* global ProfileAge */

try {
  Components.utils.import('resource://gre/modules/ProfileAge.jsm', this);
} catch (e) {
  // polyfill for older FF versions
  const ProfileAge = () => {};
  ProfileAge.prototype.reset = new Promise(resolve => resolve());
}

export default ProfileAge;
