/* global window */
import PropTypes from 'prop-types';
import React from 'react';
import { historyPaginationHoverSignal, historyPaginationClickSignal } from '../services/telemetry/home';
import { newsPaginationClickSignal } from '../services/telemetry/news';
import config from '../../config';
import Button from './partials/button';

const ROTATION_INTERVAL = 15000;
const DEFAULT_PAGESIZE = {
  news: 3,
  history: config.constants.MAX_SPOTS,
};

class Pagination extends React.Component {
  static get propTypes() {
    return {
      contentType: PropTypes.string,
      currentPage: PropTypes.number,
      isModalOpen: PropTypes.bool,
      isNewsHover: PropTypes.bool,
      items: PropTypes.array,
      onChangePage: PropTypes.func,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      pager: {},
    };

    this.timer = null;
  }

  componentDidMount() {
    this.timer = setInterval(() => this.tick(), ROTATION_INTERVAL);
    window.addEventListener('keydown', this.onKeyDown);
    this.setPage(1, { shouldAnimate: false });
  }

  componentDidUpdate(prevProps) {
    if (this.props.items !== prevProps.items) {
      if (this.props.currentPage) {
        this.setPage(this.props.currentPage, { shouldAnimate: false });
      } else {
        this.setPage(1, { shouldAnimate: false });
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (ev) => {
    if (!this.props.isModalOpen) {
      if (ev.key === 'ArrowLeft') {
        this.prevPage();
        ev.preventDefault();
      }

      if (ev.key === 'ArrowRight') {
        this.nextPage();
        ev.preventDefault();
      }
    }
  }

  onMouseOver(page) {
    if (this.props.contentType === 'history' && page === 2) {
      historyPaginationHoverSignal(page);
    }
  }

  onPageSelected(page) {
    if (this.props.contentType === 'news') {
      newsPaginationClickSignal(page - 1);
    } else if (this.props.contentType === 'history' && page === 2) {
      historyPaginationClickSignal(page);
    }

    this.setPage(page);
  }

  getPager(totalItems, currentPage = 1, pageSize = DEFAULT_PAGESIZE[this.props.contentType]) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min((startIndex + pageSize) - 1, totalItems - 1);

    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
      pages.push(i);
    }

    return {
      totalItems,
      currentPage,
      pageSize,
      totalPages,
      startIndex,
      endIndex,
      pages,
    };
  }

  setPage(page, { shouldAnimate = true } = {}) {
    const items = this.props.items;
    /* eslint-disable-next-line react/no-access-state-in-setstate */
    let pager = this.state.pager;
    const pageSize = pager.pageSize;

    pager = this.getPager(items.length, page, pageSize);

    if (page < 1 || page > pager.totalPages) {
      return;
    }

    const pageOfItems = items.slice(pager.startIndex, pager.endIndex + 1);
    this.setState({ pager });

    this.props.onChangePage({
      pageOfItems,
      shouldAnimate: this.state.pager.totalPages > 1 && shouldAnimate,
      page,
    });

    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), ROTATION_INTERVAL);
  }

  setPageSize = (size) => {
    const pager = this.state.pager;
    pager.pageSize = size;
    this.setState(pager);
    this.setPage(1);
  }

  nextPage() {
    const pager = this.state.pager;
    let nextPage = pager.currentPage + 1;
    if (nextPage > pager.pages.length) {
      nextPage = 1;
    }
    this.setPage(nextPage);
  }


  prevPage() {
    const pager = this.state.pager;
    let nextPage = pager.currentPage - 1;
    if (nextPage === 0) {
      nextPage = pager.pages.length;
    }
    this.setPage(nextPage);
  }

  rotateNews() {
    const currentPage = this.state.pager.currentPage;
    const totalPages = this.state.pager.totalPages;

    if (currentPage === totalPages) {
      this.state.pager.currentPage = 1;
    } else {
      this.state.pager.currentPage = currentPage + 1;
    }

    this.setState(prevState => ({
      pager: prevState.pager,
    }));
    this.setPage(this.state.pager.currentPage);
  }

  tick() {
    if (this.props.contentType === 'news' && !this.props.isNewsHover) {
      this.rotateNews();
    }
  }

  render() {
    const pager = this.state.pager;
    if (!pager.pages || pager.pages.length <= 1) {
      return (
        <div className="news-pagination" />
      );
    }

    const items = pager.pages.map(page =>
      (
        <Button
          className={`dash ${((page === pager.currentPage) ? 'active' : '')}`}
          href="#"
          key={page}
          label={page}
          onClick={() => this.onPageSelected(page)}
          onMouseOver={() => this.onMouseOver(page)}
        />
      ));
    return (
      <div className="news-pagination">{items}</div>
    );
  }
}


export default Pagination;
