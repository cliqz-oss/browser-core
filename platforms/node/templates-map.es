import Images from '../../components/deep-results/Images';
import News from '../../components/deep-results/News';
import SimpleLinks from '../../components/deep-results/SimpleLinks';
import Social from '../../components/deep-results/Social';
import Soccer1Game from '../../components/extras/Soccer1Game';
import SoccerTable from '../../components/extras/SoccerTable';
import LiveTicker from '../../components/extras/LiveTicker';


export const headersMap = {
  images: Images,
  news: News,
}
export const footersMap = {
  social: Social,
  streaming: Social, // temp
  simple_links: SimpleLinks
}

export const extrasMap = {
  ligaEZ1Game: Soccer1Game,
  ligaEZTable: SoccerTable,
  liveTicker: LiveTicker,
}


// order ??
export default ['images', 'news', 'social', 'streaming', 'simple_links'];