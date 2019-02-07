import React from 'react';
import PropTypes from 'prop-types';
import Link from './partials/link';
import Logo from './logo';
import t from '../i18n';
import { newsClickSignal, newsHoverSignal } from '../services/telemetry/news';

let startEnter = 0;

function Article({
  article,
  charsToRemoveFromTitle,
  index,
  maxChars,
  newsLanguage,
}) {
  const onMouseEnter = () => {
    startEnter = Date.now();
  };

  const onMouseLeave = (ev) => {
    const elapsed = Date.now() - startEnter;
    const type = article.type;
    const edition = article.edition;
    startEnter = 0;
    if (elapsed > 2000) {
      newsHoverSignal(ev, type, index, elapsed, edition);
    }
  };

  const truncate = (text, limit) => {
    let requiresSpace = true;
    if (newsLanguage === 'fr') {
      requiresSpace = false;
    }
    const dots = '...';
    const truncation = requiresSpace ? ` ${dots}` : dots;
    let str = text.trim();
    if (str.length > limit) {
      str = str.substring(0, limit);
      str = str.substr(0, Math.min(str.length, str.lastIndexOf(' ')));
      if (str[str.length - 1] !== '.') {
        str += truncation;
      }
    }

    return str;
  };

  const isBreakingNews = () => article.type === 'breaking-news';

  return (
    <Link
      href={article.url}
      idx={`${index}`}
      onClick={ev => newsClickSignal(
        ev,
        article.type,
        index,
        article.edition
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="header">
        <Logo logo={article.logo} />
        <div className="url">{article.displayUrl}</div>
      </div>

      <div className="news-title">
        {isBreakingNews()
          && (
            <span className="breaking-news">
              {article.breaking_label
                ? article.breaking_label
                : t('app_news_breaking_news')
              }&nbsp;
            </span>
          )
        }
        {
          truncate(
            article.title,
            maxChars - charsToRemoveFromTitle
          )
        }
      </div>
      <div className="news-description">
        {
          truncate(article.description,
            maxChars + 15)
        }
      </div>
      <div className="read-more-button">{t('app_news_read_more')}</div>
    </Link>
  );
}

Article.propTypes = {
  article: PropTypes.shape({
    type: PropTypes.string,
    url: PropTypes.string,
    displayUrl: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    breaking_label: PropTypes.string,
    logo: PropTypes.object,
    edition: PropTypes.string,
  }),
  charsToRemoveFromTitle: PropTypes.number,
  index: PropTypes.number,
  maxChars: PropTypes.number,
  newsLanguage: PropTypes.string,
};

export default Article;
