import window from 'platform/window';
var CliqzLanguage = {
  stateToQueryString: function () { return `&lang=${window.navigator.language.slice(0, 2)}`; }
};

export default CliqzLanguage;
