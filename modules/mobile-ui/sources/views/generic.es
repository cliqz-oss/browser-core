import localView from 'mobile-ui/views/local-data-sc';

export class GenericResult {

  get links() {
    return (this.deepResults || []).reduce((previous, current) => {
      if (current.type === 'buttons' || current.type === 'simple_links') {
        previous = previous.concat(current.links);
      }
      return previous;
    }, []);
  }

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

function getLogoDetails(url) {
  return CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url));
}

function attachLogoDetails(resources = []) {
  return resources.map(resource => Object.assign({}, resource, {
    logoDetails: getLogoDetails(resource.url),
  }));
}

export default class Generic extends localView {

  enhanceResults(data, screen) {
    if (data.subType && data.subType.class === 'EntityLocal') {
      super.enhanceResults(data.extra);
    }
    const result = data;
    if (result.extra) {
      result.extra.rich_data = result.extra.rich_data || {};
    }
    result.screen = screen;
    Object.setPrototypeOf(result, GenericResult.prototype);

  }
}
