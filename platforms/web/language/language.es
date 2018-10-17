import window from '../window';

const CliqzLanguage = {
  init() {},
  unload() {},
  stateToQueryString() { return `&lang=${window.navigator.language.slice(0, 2)}`; }
};

export default CliqzLanguage;
