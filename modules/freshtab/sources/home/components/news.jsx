/* global window */

import React from 'react';
import PropTypes from 'prop-types';
import Pagination from './pagination';
import Article from './article';

const styles = {
  transition: 'opacity 0.3s ease-in-out'
};

const threeNewsBreakpoint = 1023;
const twoNewsBreakpoint = 919;
const largeBreakpoint = 1600;

export default class News extends React.Component {
  static get propTypes() {
    return {
      news: PropTypes.array,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      pageOfItems: [],
      isNewsHover: false,
      boxClassName: '',
      opacity: 1,
      currentPageSize: 0,
      articleCharsLimit: 120,
      charsToRemoveFromTitle: 20,
    };

    this.onChangePage = this.onChangePage.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.didResize = this.didResize.bind(this);
    this.updatePageSize = this.updatePageSize.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.didResize);
    this.updatePageSize(window.innerWidth);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.didResize);
  }

  componentDidUpdate(prevProps) {
    // Check if news has been changed by selecting another country
    if (this.props.news !== prevProps.news) {
      this._pagination.setPage(1); // Update news
    }
  }

  onMouseEnter() {
    this.setState({ isNewsHover: true });
  }

  onMouseLeave() {
    this.setState({ isNewsHover: false });
  }

  onChangePage(pageOfItems, shouldNotAnimate) {
    if (this.state.pageOfItems.length === 0 || shouldNotAnimate) {
      this.setState({
        pageOfItems,
        opacity: 1
      });
      return;
    }
    this.setState({
      pageOfItems: this.state.pageOfItems,
      opacity: 0
    });
    setTimeout(() => {
      this.setState({
        pageOfItems,
        opacity: 1
      });
    }, 300);
  }

  didResize(event) {
    const width = event.target.innerWidth;
    this.updatePageSize(width);
  }

  updatePageSize(width) {
    if (width > threeNewsBreakpoint) {
      if (this.state.currentPageSize === 3) {
        return;
      }
      this._pagination.setPageSize(3);
      this.setState({ currentPageSize: 3 });
      if (width > largeBreakpoint) {
        this.setState({ articleCharsLimit: 150 });
      } else {
        this.setState({ articleCharsLimit: 100 });
      }
    } else if (width > twoNewsBreakpoint) {
      if (this.state.currentPageSize === 2) {
        return;
      }
      this._pagination.setPageSize(2);
      this.setState({
        currentPageSize: 2,
        articleCharsLimit: 110
      });
    } else {
      if (this.state.currentPageSize === 1) {
        return;
      }
      this._pagination.setPageSize(1);
      this.setState({
        currentPageSize: 1,
        articleCharsLimit: 160,
        charsToRemoveFromTitle: 40
      });
    }
  }

  render() {
    return (
      <div className="news">
        <Pagination
          ref={(pagination) => { this._pagination = pagination; }}
          items={this.props.news.data}
          onChangePage={this.onChangePage}
          isNewsHover={this.state.isNewsHover}
          isModalOpen={this.props.isModalOpen}
        />

        <div className="news-container" style={{ ...styles, opacity: this.state.opacity }}>
          <div className="news-content">
            {
              this.state.pageOfItems.map((article, index) =>
                (<div
                  key={article.url}
                  className="box"
                  onMouseEnter={this.onMouseEnter}
                  onMouseLeave={this.onMouseLeave}
                >
                  <Article
                    article={article}
                    index={(this._pagination.state.pager.pageSize
                      * (this._pagination.state.pager.currentPage - 1)) + index}
                    currentPage={this._pagination.state.pager.currentPage}
                    pageSize={this._pagination.state.pager.pageSize}
                    maxChars={this.state.articleCharsLimit}
                    newsLanguage={this.props.newsLanguage}
                    charsToRemoveFromTitle={this.state.charsToRemoveFromTitle}
                  />
                </div>)
              )
            }
          </div>
        </div>
      </div>
    );
  }
}
