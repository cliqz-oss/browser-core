/* global window */
import PropTypes from 'prop-types';
import React from 'react';
import { newsPaginationClickSignal } from '../services/telemetry/news';

const ROTATION_INTERVAL = 15000;

class Pagination extends React.Component {
  static get propTypes() {
    return {
      items: PropTypes.array,
      onChangePage: PropTypes.func,
      isNewsHover: PropTypes.bool,
    };
  }

  constructor(props) {
    super(props);
    this.state = {
      pager: {},
    };

    this.timer = null;
    this.setPageSize = this.setPageSize.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  componentDidMount() {
    this.timer = setInterval(() => this.tick(), ROTATION_INTERVAL);
    window.addEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps) {
    if (this.props.items !== prevProps.items) {
      this.setPage(1);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown(ev) {
    if (ev.key === 'ArrowLeft') {
      this.prevPage();
      ev.preventDefault();
    }

    if (ev.key === 'ArrowRight') {
      this.nextPage();
      ev.preventDefault();
    }
  }

  onPageSelected(page) {
    newsPaginationClickSignal(page - 1);
    this.setPage(page);
  }

  getPager(totalItems, currentPage = 1, pageSize = 3) {
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

  setPage(page) {
    const items = this.props.items;
    let pager = this.state.pager;
    const pageSize = pager.pageSize;

    pager = this.getPager(items.length, page, pageSize);

    if (page < 1 || page > pager.totalPages) {
      return;
    }

    const pageOfItems = items.slice(pager.startIndex, pager.endIndex + 1);
    this.setState({ pager });

    this.props.onChangePage(pageOfItems);

    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), ROTATION_INTERVAL);
  }

  setPageSize(size) {
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
    const pager = this.state.pager;
    const currentPage = this.state.pager.currentPage;
    const totalPages = this.state.pager.totalPages;
    if (currentPage === totalPages) {
      pager.currentPage = 1;
    } else {
      pager.currentPage = currentPage + 1;
    }
    this.setState({
      pager,
    });
    this.setPage(this.state.pager.currentPage);
  }

  tick() {
    if (!this.props.isNewsHover) {
      this.rotateNews();
    }
  }

  render() {
    const pager = this.state.pager;
    if (!pager.pages || pager.pages.length <= 1) {
      return null;
    }

    const newsItems = pager.pages.map((page, index) =>
      <button
        href="#"
        key={index}
        className={`dash ${((page === pager.currentPage) ? 'active' : '')}`}
        onClick={() => this.onPageSelected(page)}
      >
        <span className="overflow-hidden">{index}</span>
      </button>
    );
    return (
      <div className="news-pagination">{newsItems}</div>
    );
  }
}


export default Pagination;
