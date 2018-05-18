import prefs from '../../core/prefs';


const isDeveloper = () =>
  prefs.get('developer', false) || prefs.get('offersDevFlag', false);


const getGID = () => prefs.getObject('anolysisGID');


// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
const getHpnTimeStamp = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, '');
};

const getMinuteTimestamp = () => Math.floor((Date.now() / 1000) / 60);


export {
  isDeveloper,
  getGID,
  getHpnTimeStamp,
  getMinuteTimestamp
};
