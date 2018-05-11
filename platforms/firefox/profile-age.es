try {
  Components.utils.import('resource://gre/modules/ProfileAge.jsm', this);
} catch(e){
  // polyfill for older FF versions
  var ProfileAge = function () {};
  ProfileAge.prototype.reset = new Promise((resolve)=>resolve());
}

export default ProfileAge;
