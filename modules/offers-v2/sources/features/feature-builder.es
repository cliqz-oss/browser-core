import GeoChecker from './geo_checker';
import HistoryFeature from './history-feature';

export default function getFeatures() {
  return [
    new GeoChecker(),
    new HistoryFeature(),
  ];
}
