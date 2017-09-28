import currency from './views/currency';
import entityGeneric from './views/entity-generic';
import localDataSc from './views/local-data-sc';
import generic from './views/generic';
import liveTicker from './views/liveTicker';
import soccerTable from './views/soccerTable';
import soccerTeam from './views/soccerTeam';
import lotto from './views/lotto';
import soccer from './views/soccer';

export default {
  currency,
  'entity-generic': entityGeneric,
  EntityLocal: localDataSc,
  generic,
  liveTicker,
  ligaEZTable: soccerTable,
  ligaEZGroup: soccerTable,
  ligaEZ1Game: soccerTeam,
  lotto,
  soccer,
};
