import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import t from '../i18n';
import { newsClickSignal, newsHoverSignal } from '../services/telemetry/news';

let startEnter = 0;

class Article extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isBreakingNews: false
    };

    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
  }

  onMouseEnter() {
    startEnter = Date.now();
  }

  onMouseLeave(ev) {
    const elapsed = Date.now() - startEnter;
    const type = this.props.article.type;
    const index = this.props.index;
    const edition = this.props.article.edition;
    startEnter = 0;
    if (elapsed > 2000) {
      newsHoverSignal(ev, type, index, elapsed, edition);
    }
  }

  truncate(text, maxChars) {
    let requiresSpace = true;
    if (this.props.newsLanguage === 'fr') {
      requiresSpace = false;
    }
    const dots = '...';
    const truncation = requiresSpace ? ` ${dots}` : dots;
    let str = text.trim();
    const limit = maxChars;
    if (str.length > limit) {
      str = str.substring(0, limit);
      str = str.substr(0, Math.min(str.length, str.lastIndexOf(' ')));
      if (str[str.length - 1] !== '.') {
        str += truncation;
      }
    }

    return str;
  }

  get isBreakingNews() {
    return this.props.article.type === 'breaking-news';
  }

  render() {
    return (
      <a
        href={this.props.article.url}
        onClick={ev => newsClickSignal(
          ev,
          this.props.article.type,
          this.props.index,
          this.props.article.edition)}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        data-index={this.props.index}
      >
        <div className="header">
          <Logo logo={this.props.article.logo} />
          <div className="url">{this.props.article.displayUrl}</div>
        </div>

        <div className="news-title">
          { this.isBreakingNews &&
            <span className="breaking-news">
              { this.props.article.breaking_label
                ? this.props.article.breaking_label
                : t('app_news_breaking_news')
              }&nbsp;
            </span>
          }
          {
            this.truncate(
              this.props.article.title,
              this.props.maxChars - 20
            )
          }
        </div>
        <div className="news-description">
          {
            this.truncate(this.props.article.description,
              this.props.maxChars + 15)
          }
        </div>
        <div className="read-more-button">{ t('app_news_read_more') }</div>
      </a>
    );
  }
}

Article.propTypes = {
  article: PropTypes.shape({
    type: PropTypes.string,
    url: PropTypes.string,
    displayUrl: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    breaking_label: PropTypes.bool,
    logo: PropTypes.shape({}),
    edition: PropTypes.string,
  }),
  index: PropTypes.number,
  maxChars: PropTypes.number
};

export default Article;
