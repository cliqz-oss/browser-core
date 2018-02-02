import BaseProvider from './base';

const TEMPLATE_TO_SOURCE_MAP = {
  people: 'p',
  news: 'n',
  video: 'v',
  hq: 'h',
  bm: 'm',
  reciperd: 'r',
  game: 'g',
  movie: 'o',
};

export default class BackendProvider extends BaseProvider {
  getKind({ type, template, subType }) {
    if (type === 'rh') {
      const subTypeClass = subType.class;
      let extra = '';
      if (subTypeClass) {
        extra = `|${JSON.stringify({ class: subTypeClass })}`;
      }
      return `X${extra}`;
    }

    if (type === 'bm') {
      if (!template) {
        return 'm';
      }
      return TEMPLATE_TO_SOURCE_MAP[template];
    }

    return '';
  }

  mapResults({ results, q }) {
    return results.map((result) => {
      const snippet = result.snippet || {};
      return {
        ...result,
        url: result.url,
        originalUrl: result.url,
        title: snippet.title,
        type: result.type,
        text: q,
        description: snippet.description,
        provider: this.id,
        data: {
          ...snippet,
          kind: [this.getKind(result)],
          template: result.template,
        },
      };
    });
  }
}
