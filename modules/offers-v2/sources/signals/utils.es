import prefs from '../../core/prefs';


const isDeveloper = () =>
  prefs.get('developer', false) || prefs.get('offersDevFlag', false);


const getGID = () => prefs.getObject('anolysisGID');


// (EX-4191) Fix hpn-ts format to "yyyyMMdd"
const getHpnTimeStamp = () => prefs.get('config_ts', '19700101');

const getMinuteTimestamp = () => Math.floor((Date.now() / 1000) / 60);


export {
  isDeveloper,
  getGID,
  getHpnTimeStamp,
  getMinuteTimestamp
};
