import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementSideMargins, elementTopMargin } from '../../styles/CardStyle';
import Link from '../Link';
import Icon from '../partials/Icon';
import Url from '../partials/Url';
import ExpandView from '../ExpandView';
import MovieData from './MovieData';

// trigger with query: cadillac kino
// make sure results are set to germany

export default class extends React.Component {

  displayShow(show, index) {
    return (
      <Link key={index} to={show.booking_link}>
        <View style={styles.show}>
          <Text style={styles.text}>{ show.start_at.substr(11, 5) }</Text>
        </View>
      </Link>
    );
  }

  displayCinema(cinema, index) {
    const content = (
      <View style={styles.showContainer}>
        { cinema.showtimes.map(this.displayShow) }
      </View>
    );
    const header = (
      <View style={{flexDirection: 'row'}}>
        <Icon url={cinema.website} width={34} height={34} />
        <View style={styles.cinemaHeader}>
          <Url url={cinema.website} oneLine={true} />
          <Text numberOfLines={1} style={styles.cinemaTitle}>{cinema.name}</Text>
        </View>
      </View>
    );
    return (
      <ExpandView key={index} index={index} header={header} content={content} />
    );
  }

  render() {
    const data = this.props.data.data || {};
    const showsToday = data.showdates[0] || {};
    const cinemaList = showsToday.cinema_list || [];
    if (cinemaList.length === 0) {
      return null;
    }
    return (
      <View>
        <Text style={styles.header}>
          { getMessage('cinema_movie_showtimes') }
          <Text style={styles.text}>: { (showsToday.date || '').toUpperCase() }</Text>
        </Text>
        { cinemaList.map(this.displayCinema.bind(this)) }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    color: 'black',
    marginBottom: 5,
    ...elementTopMargin,
    marginLeft: 12,
    fontSize: 15,
  },
  cinemaHeader: {
    justifyContent: 'space-between',
  },
  cinemaTitle: {
    marginLeft: 10,
    marginRight: 34, // logo size
    color: 'black',
  },
  text: {
    color: 'black',
  },
  showContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  show: {
    padding: 3,
    marginRight: 10,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
  },
});
