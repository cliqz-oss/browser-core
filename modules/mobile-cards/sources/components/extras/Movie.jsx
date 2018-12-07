import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

import { getMessage } from '../../../core/i18n';
import { elementTopMargin } from '../../styles/CardStyle';
import Link from '../Link';
import Icon from '../partials/Icon';
import Url from '../partials/Url';
import ExpandView from '../ExpandView';
import themeDetails from '../../themes';

// trigger with query: cadillac kino
// make sure results are set to germany

const styles = theme => StyleSheet.create({
  header: {
    color: themeDetails[theme].textColor,
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
    color: themeDetails[theme].cinema.movieTxtColor,
  },
  text: {
    color: themeDetails[theme].textColor,
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
    backgroundColor: themeDetails[theme].cinema.showBgColor,
    borderRadius: 5,
  },
});

export default class extends React.Component {
  displayShow(show, theme) {
    return (
      <Link url={show.booking_link} key={show.booking_link}>
        <View style={styles(theme).show}>
          <Text style={styles(theme).text}>{ show.start_at.substr(11, 5) }</Text>
        </View>
      </Link>
    );
  }

  displayCinema(cinema, index) {
    const logo = this.props.result.meta.extraLogos[cinema.website];
    const theme = this.props.theme;
    const key = `${cinema.website}${index}`;
    const content = (
      <View style={styles(theme).showContainer}>
        { cinema.showtimes.map(show => this.displayShow(show, theme)) }
      </View>
    );
    const header = (
      <View style={{ flexDirection: 'row' }}>
        <Icon logoDetails={logo} width={34} height={34} />
        <View style={styles(theme).cinemaHeader}>
          <Url url={cinema.website} oneLine />
          <Text numberOfLines={1} style={styles(theme).cinemaTitle}>{cinema.name}</Text>
        </View>
      </View>
    );
    return (
      <ExpandView key={key} index={index} header={header} content={content} theme={theme} />
    );
  }

  render() {
    const data = this.props.data.data || {};
    const theme = this.props.theme;
    const showsToday = data.showdates[0] || {};
    const cinemaList = showsToday.cinema_list || [];
    if (cinemaList.length === 0) {
      return null;
    }
    return (
      <View>
        <Text style={styles(theme).header}>
          { getMessage('cinema_movie_showtimes') }
          <Text style={styles(theme).text}>
            {`: ${(showsToday.date || '').toUpperCase()}`}
          </Text>
        </Text>
        { cinemaList.map((...args) => this.displayCinema(...args)) }
      </View>
    );
  }
}
