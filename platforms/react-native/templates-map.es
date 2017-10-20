import Images from '../../components/deep-results/Images';
import News from '../../components/deep-results/News';
import Videos from '../../components/deep-results/Videos';
import SimpleLinks from '../../components/deep-results/SimpleLinks';
import Social from '../../components/deep-results/Social';
import Streaming from '../../components/deep-results/Streaming';
import SoccerTeam from '../../components/extras/SoccerTeam';
import SoccerTable from '../../components/extras/SoccerTable';
import LiveTicker from '../../components/extras/LiveTicker';
import Calculator from '../../components/extras/Calculator';
import Recipe from '../../components/extras/Recipe';
import Lotto from '../../components/extras/Lotto';
import Weather from '../../components/extras/Weather';
import Currency from '../../components/extras/Currency';
import Local from '../../components/extras/Local';


export const headersMap = {
  images: Images,
  news: News,
  videos: Videos,
}
export const footersMap = {
  // social: Social, parked for now
  simple_links: SimpleLinks,
  streaming: Streaming,
}

export const extrasMap = {
  ligaEZ1Game: SoccerTeam,
  ligaEZTable: SoccerTable,
  ligaEZGroup: SoccerTable,
  liveTicker: LiveTicker,
  calculator: Calculator,
  recipeRD: Recipe,
  lotto: Lotto,
  weatherEZ: Weather,
  currency: Currency,
  'local-data-sc': Local,
}


// order ??
export default ['images', 'news', 'social', 'streaming', 'simple_links'];