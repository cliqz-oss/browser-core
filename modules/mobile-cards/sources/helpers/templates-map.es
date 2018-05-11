import Images from '../components/deep-results/Images';
import News from '../components/deep-results/News';
import Videos from '../components/deep-results/Videos';
import SimpleLinks from '../components/deep-results/SimpleLinks';
import Download from '../components/deep-results/Download';
import Social from '../components/deep-results/Social';
import Streaming from '../components/deep-results/Streaming';
import SoccerTeam from '../components/extras/SoccerTeam';
import SoccerTable from '../components/extras/SoccerTable';
import LiveTicker from '../components/extras/LiveTicker';
import Calculator from '../components/extras/Calculator';
import Recipe from '../components/extras/Recipe';
import Lotto from '../components/extras/Lotto';
import Weather from '../components/extras/Weather';
import Currency from '../components/extras/Currency';
import Local from '../components/extras/Local';
import Movie from '../components/extras/Movie';


export const headersMap = {
  images: Images,
  news: News,
  videos: Videos,
}
export const footersMap = {
  social: Social,
  simple_links: SimpleLinks,
  buttons: SimpleLinks,
  download: Download,
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
  movie: Movie,
}


// order
export default ['images', 'news', 'videos', 'social', 'streaming', 'simple_links', 'buttons', 'download'];
