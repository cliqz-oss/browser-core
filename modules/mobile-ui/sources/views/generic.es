import LocalView from './local-data-sc';

export class GenericResult {

  get shortDescription() {
    let description = this.description;
    if (this.template === 'pattern-h2' && this.description) {
      // rough calculations to determine how much of description to show
      // line padding: 60, character width: 10, keyboard height: 400, line height: 20
      const descLength = ((this.screen.width - 60) / 10)
                         * Math.max((this.screen.height - 400) / 20, 1);
      if (this.description.length > descLength + 3) {
        const shortDescription = this.description.slice(0, descLength);
        description = `${shortDescription}...`;
      }
    }
    return description;
  }
}

export default class Generic {

  enhanceResults(data, screen) {
    if (data.subType && data.subType.class === 'EntityLocal') {
      new LocalView().enhanceResults(data.extra);
    }

    data.screen = screen;
    Object.setPrototypeOf(data, GenericResult.prototype);



    let partials = [];
    const headerTypes = ['logo', 'urlDetails', 'title'];
    const mediaTypes = ['images', 'videos', 'news'];
    const specificTypes = ['local-data-sc', 'movie', 'movie-vod', 'recipeRD', 'liveTicker', 'ligaEZ1Game', 'ligaEZTable'];

    headerTypes.forEach(partial => partials.push({type: partial, data: data[partial], historyStyle: data.historyStyle}));

    const footers = (data.deepResults || []).filter(res => {
      res.links = (res.links || []).slice(0, 3);
      if (mediaTypes.indexOf(res.type) > -1) {
        partials.push(res);
        return false;
      }
      return true;
    });

    if (data.extra) {
      partials.push({type: 'header-extra', data: data.extra.rich_data});

      partials.push({type: 'main-image', data: data.extra});

      // specific
      specificTypes.forEach(partial => {

        if (data.template === partial || data.extra.superTemplate === partial) {
          partials.push({type: partial, data: data.extra})
        }
      });
    }


    // description
    partials.push({type: 'shortDescription', data: data.shortDescription});

    // history
    if (data.urls) {
      partials.push({type: 'history', data: data.urls.slice(0, 3)});
    }

    // put streaming first
    // footers
    partials = partials.concat(footers.sort((first, second) => second.type === 'streaming' ? 1 : -1));

    // filter empty deep results
    data.partials = partials.filter(partial => !partial.links || partial.links.length);

    data.partials.forEach(partial => partial.query = data.query);
  }
}
