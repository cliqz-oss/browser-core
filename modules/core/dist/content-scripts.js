// https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
function globsMatch(find, source) {
  find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
  find = find.replace(/\*/g, ".*");
  find = find.replace(/\?/g, ".");
  var regEx = new RegExp(find, "i");
  return regEx.test(source);
}

var getContentScript = function (window, url) {

  var CONTENT_SCRIPTS = {
  };


  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  for (var prop in CONTENT_SCRIPTS) {
    if (CONTENT_SCRIPTS.hasOwnProperty(prop)) {
      if(globsMatch(prop, url)){
        return CONTENT_SCRIPTS[prop];
      }
    }
  }

};
