import Board from './board';

export default class Dashboard extends Board {
  get notifications() {
    const params = this.props.navigation.state.params;
    if (!params.data.notifications) {
      return [];
    }

    return params.data.notifications || [];
  }

  get recommendations() {

    if(this.props.screenProps.news.news) {
      const domain = this.props.navigation.state.params.domain;
      return this.props.screenProps.news.news.filter(newsItem => domain.indexOf(newsItem.displayUrl) !== -1)
    }
    return [];
  }

  get baseUrl() {
    const params = this.props.navigation.state.params;
    return params.baseUrl;
  }

  get snippet() {
    const params = this.props.navigation.state.params;
    const data = params.data || {};
    return params.data.snippet;
  }


  get links() {
    const params = this.props.navigation.state.params;
    const data = params.data || {};
    const linkTypes = data.links || [];
    const links = linkTypes.find(l => l.type === "buttons") || { links: [] };
    return links.links.slice(0, 3);
  }

  get history() {
    const params = this.props.navigation.state.params;
    return params.data.visits;
  }
}
