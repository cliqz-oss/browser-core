import React from 'react';
import PropTypes from 'prop-types';
import Logo from './logo';
import t from '../i18n';
import { newsClickSignal } from '../services/telemetry/news';

class Article extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isBreakingNews: false
    };
  }

  truncate(text, maxChars) {
    const dots = '...';
    let str = text.trim();
    const limit = maxChars;
    if (str.length > limit) {
      str = str.substring(0, limit);
      str = str.substr(0, Math.min(str.length, str.lastIndexOf(' '))) + dots;
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
        onClick={() => newsClickSignal(this.isBreakingNews, this.props.index)}
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
                : t('app.news.breaking-news')
              }&nbsp;
            </span>
          }
          {
            this.truncate(this.props.article.title,
            this.props.maxChars - 40)
          }
        </div>
        <div className="news-description">
          {
            this.truncate(this.props.article.description,
            this.props.maxChars)
          }
        </div>
        <div className="read-more-button">{ t('app.news.read-more') }</div>
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
  }),
  index: PropTypes.number,
  maxChars: PropTypes.number,
};

export default Article;
