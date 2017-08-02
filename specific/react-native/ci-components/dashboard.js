import Board from './board';

export default class Dashboard extends Board {
  get notifications() {
    const store = this.props.screenProps.store;
    return store.notifications || [];
  }
  get recommendations() {

    if (this.props.screenProps.news.news !== undefined) {
      const domainsHistory = Object.keys(this.props.screenProps.store.history.domains);
      const news = this.props.screenProps.news.news.filter(newsObj => !domainsHistory.some(elem => elem.indexOf(newsObj.displayUrl) !== -1));
      return news || [];
    }

    return [];
  }

  get history() {
    const params = this.props.navigation.state.params;
    return params;
  }
}
