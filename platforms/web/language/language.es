import window from '../window';

const CliqzLanguage = {
  stateToQueryString() { return `&lang=${window.navigator.language.slice(0, 2)}`; }
};

export default CliqzLanguage;
